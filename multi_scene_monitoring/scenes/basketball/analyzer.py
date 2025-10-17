from __future__ import annotations

from typing import List, Optional

import numpy as np

from ..base import (
    Detection,
    ScenarioAnalyzer,
    angle_between,
    compute_body_basis,
    joint_distance,
)


class BasketballAnalyzer(ScenarioAnalyzer):
    name = "basketball"

    def __init__(self, min_confidence: float = 0.6):
        self.min_confidence = min_confidence

    def analyze(self, canonical_poses, raw_poses, poses_2d) -> List[Detection]:
        detections: List[Detection] = []
        if canonical_poses is None:
            return detections
        for idx, pose in enumerate(canonical_poses):
            # 投篮检测
            shooting = self._detect_shooting(pose, idx)
            if shooting:
                detections.append(shooting)
            # 运球检测
            dribbling = self._detect_dribbling(pose, idx)
            if dribbling:
                detections.append(dribbling)
            # 防守姿态检测
            defense = self._detect_defense(pose, idx)
            if defense:
                detections.append(defense)
        return detections

    def _detect_shooting(self, pose: np.ndarray, person_idx: int) -> Optional[Detection]:
        up, left_to_right, front = compute_body_basis(pose)
        if np.linalg.norm(up) < 1e-6:
            return None

        # Evaluate both hands and pick the stronger evidence
        right = self._evaluate_hand(
            pose, person_idx,
            shoulder_idx=9, elbow_idx=10, wrist_idx=11,
            opposite_wrist_idx=5,
            side_label="right",
            up=up, front=front, left_to_right=left_to_right,
        )
        left = self._evaluate_hand(
            pose, person_idx,
            shoulder_idx=3, elbow_idx=4, wrist_idx=5,
            opposite_wrist_idx=11,
            side_label="left",
            up=up, front=front, left_to_right=-left_to_right,
        )
        best = max([det for det in [right, left] if det], key=lambda d: d.confidence, default=None)
        if best and best.confidence >= self.min_confidence:
            return best
        return None

    def _evaluate_hand(
        self,
        pose: np.ndarray,
        person_idx: int,
        shoulder_idx: int,
        elbow_idx: int,
        wrist_idx: int,
        opposite_wrist_idx: int,
        side_label: str,
        up: np.ndarray,
        front: np.ndarray,
        left_to_right: np.ndarray,
    ) -> Optional[Detection]:
        shoulder = pose[shoulder_idx]
        elbow = pose[elbow_idx]
        wrist = pose[wrist_idx]
        opposite_wrist = pose[opposite_wrist_idx]
        hip_center = (pose[6] + pose[12]) / 2

        # Metric 1: wrist height above shoulder
        wrist_height = float(np.dot(wrist - shoulder, up))
        # Metric 2: elbow bend angle
        elbow_angle = angle_between(shoulder - elbow, wrist - elbow)
        # Metric 3: hands close together (supporting the ball)
        shoulder_span = max(joint_distance(pose[9], pose[3]), 1e-6)
        hand_distance = joint_distance(wrist, opposite_wrist)
        hand_proximity = 1.0 - min(hand_distance / (shoulder_span * 1.5), 1.0)
        # Metric 4: release direction (forward component)
        release_forward = float(np.dot(wrist - hip_center, front))

        score = 0.0
        if wrist_height > 0.15:
            score += 0.35
        if 45.0 <= elbow_angle <= 140.0:
            score += 0.30
        if hand_proximity > 0.4:
            score += 0.20
        if release_forward > 0.05:
            score += 0.10
        if wrist_height > 0.30:
            score += 0.10

        confidence = min(score, 1.0)
        if confidence <= 0:
            return None

        description = (
            f"{side_label.title()} hand elevated ({wrist_height:.2f}), "
            f"elbow {elbow_angle:.0f}°, hands proximity {hand_proximity:.2f}"
        )
        return Detection(
            person_index=person_idx,
            label="shooting posture",
            confidence=confidence,
            description=description,
        )

    def _detect_dribbling(self, pose: np.ndarray, person_idx: int) -> Optional[Detection]:
        """检测运球动作"""
        up, left_to_right, front = compute_body_basis(pose)
        if np.linalg.norm(up) < 1e-6:
            return None

        # 检测手部位置是否在腰部以下
        left_wrist = pose[5]
        right_wrist = pose[11]
        hip_center = (pose[6] + pose[12]) / 2
        
        # 计算手腕相对于髋部的高度
        left_wrist_height = float(np.dot(left_wrist - hip_center, up))
        right_wrist_height = float(np.dot(right_wrist - hip_center, up))
        
        # 运球时手腕应该在腰部以下
        min_wrist_height = min(left_wrist_height, right_wrist_height)
        
        # 检测身体前倾角度（运球时通常会前倾）
        chest = (pose[3] + pose[9]) / 2  # 肩部中心
        forward_lean = float(np.dot(chest - hip_center, front))
        
        score = 0.0
        if min_wrist_height < -0.1:  # 手腕在髋部以下
            score += 0.4
        if forward_lean > 0.05:  # 身体前倾
            score += 0.3
        if abs(left_wrist_height - right_wrist_height) < 0.2:  # 双手高度相近
            score += 0.3
            
        confidence = min(score, 1.0)
        if confidence < self.min_confidence:
            return None
            
        return Detection(
            person_index=person_idx,
            label="dribbling posture",
            confidence=confidence,
            description=f"运球姿态，手腕高度 {min_wrist_height:.2f}，前倾 {forward_lean:.2f}"
        )

    def _detect_defense(self, pose: np.ndarray, person_idx: int) -> Optional[Detection]:
        """检测防守姿态"""
        up, left_to_right, front = compute_body_basis(pose)
        if np.linalg.norm(up) < 1e-6:
            return None

        # 检测膝盖弯曲程度
        left_knee = pose[7]
        right_knee = pose[13]
        left_hip = pose[6]
        right_hip = pose[12]
        
        # 计算膝盖角度
        left_knee_angle = angle_between(left_hip - left_knee, pose[8] - left_knee)
        right_knee_angle = angle_between(right_hip - right_knee, pose[14] - right_knee)
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
        
        # 检测手臂位置（防守时手臂应该张开）
        left_shoulder = pose[3]
        right_shoulder = pose[9]
        left_wrist = pose[5]
        right_wrist = pose[11]
        
        # 计算手臂展开程度
        arm_span = joint_distance(left_wrist, right_wrist)
        shoulder_span = joint_distance(left_shoulder, right_shoulder)
        arm_extension = arm_span / shoulder_span if shoulder_span > 0 else 0
        
        # 检测身体重心（防守时重心应该较低）
        hip_center = (pose[6] + pose[12]) / 2
        shoulder_center = (pose[3] + pose[9]) / 2
        body_height = joint_distance(shoulder_center, hip_center)
        
        score = 0.0
        if avg_knee_angle < 120:  # 膝盖弯曲
            score += 0.4
        if arm_extension > 1.2:  # 手臂展开
            score += 0.3
        if body_height < 0.4:  # 重心较低
            score += 0.3
            
        confidence = min(score, 1.0)
        if confidence < self.min_confidence:
            return None
            
        return Detection(
            person_index=person_idx,
            label="defense posture",
            confidence=confidence,
            description=f"防守姿态，膝盖角度 {avg_knee_angle:.0f}°，手臂展开 {arm_extension:.2f}"
        )


def create_analyzer() -> ScenarioAnalyzer:
    return BasketballAnalyzer()
