from __future__ import annotations

from typing import List, Optional

import numpy as np

from ..base import (
    Detection,
    ScenarioAnalyzer,
    angle_between,
    compute_body_basis,
)


class ClassroomAnalyzer(ScenarioAnalyzer):
    name = "classroom"

    def __init__(self, lean_threshold: float = 60.0, min_confidence: float = 0.6):
        self.lean_threshold = lean_threshold
        self.min_confidence = min_confidence

    def analyze(self, canonical_poses, raw_poses, poses_2d) -> List[Detection]:
        detections: List[Detection] = []
        if canonical_poses is None:
            return detections
        for idx, pose in enumerate(canonical_poses):
            detection = self._detect_lying(pose, idx)
            if detection:
                detections.append(detection)
        return detections

    def _detect_lying(self, pose: np.ndarray, person_idx: int) -> Optional[Detection]:
        up, left_to_right, front = compute_body_basis(pose)
        if np.linalg.norm(up) < 1e-6:
            return None

        hip_center = (pose[6] + pose[12]) / 2
        head = pose[1]
        shoulders = (pose[3] + pose[9]) / 2
        wrists = [pose[5], pose[11]]

        torso_vector = head - hip_center
        torso_angle = angle_between(torso_vector, up)

        head_height = float(np.dot(head - hip_center, up))
        shoulder_height = float(np.dot(shoulders - hip_center, up))
        forward_distance = float(np.dot(head - hip_center, front))
        wrist_heights = [float(np.dot(w - hip_center, up)) for w in wrists]
        min_wrist_height = min(wrist_heights)

        score = 0.0
        if torso_angle >= self.lean_threshold:
            score += 0.4
        if head_height < shoulder_height * 0.75:
            score += 0.25
        if forward_distance > 0.20:
            score += 0.2
        if min_wrist_height < shoulder_height * 0.6:
            score += 0.1

        confidence = min(score, 1.0)
        if confidence < self.min_confidence:
            return None

        description = (
            f"Torso angle {torso_angle:.0f}°, head height {head_height:.2f}, "
            f"forward shift {forward_distance:.2f}"
        )
        return Detection(
            person_index=person_idx,
            label="leaning on desk",
            confidence=confidence,
            description=description,
        )


def create_analyzer() -> ScenarioAnalyzer:
    return ClassroomAnalyzer()
