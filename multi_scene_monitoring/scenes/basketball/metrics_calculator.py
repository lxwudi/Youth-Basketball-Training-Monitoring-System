"""篮球专项指标计算器"""

import numpy as np
from typing import Dict, List, Optional, Tuple
from ..base import angle_between, compute_body_basis, joint_distance


class BasketballMetricsCalculator:
    """计算篮球训练中的关键指标"""
    
    def __init__(self):
        self.prev_wrist_heights: List[float] = []
        self.prev_body_heights: List[float] = []
        self.frame_count = 0
        
    def calculate_all_metrics(self, pose: np.ndarray) -> Dict[str, float]:
        """计算所有篮球相关指标"""
        metrics = {}
        
        # 基础角度指标
        metrics.update(self._calculate_joint_angles(pose))
        
        # 篮球专项指标
        metrics.update(self._calculate_basketball_specific(pose))
        
        # 防守专项指标
        metrics.update(self._calculate_defense_metrics(pose))
        
        # 投篮专项指标
        metrics.update(self._calculate_shooting_metrics(pose))
        
        # 更新历史数据
        self._update_history(pose)
        
        self.frame_count += 1
        return metrics
    
    def _calculate_joint_angles(self, pose: np.ndarray) -> Dict[str, float]:
        """计算基础关节角度"""
        angles = {}
        
        # 肩关节角度
        angles['left_shoulder_angle'] = angle_between(pose[0] - pose[3], pose[4] - pose[3])
        angles['right_shoulder_angle'] = angle_between(pose[0] - pose[9], pose[10] - pose[9])
        
        # 肘关节角度
        angles['left_elbow_angle'] = angle_between(pose[3] - pose[4], pose[5] - pose[4])
        angles['right_elbow_angle'] = angle_between(pose[9] - pose[10], pose[11] - pose[10])
        
        # 髋关节角度
        angles['left_hip_angle'] = angle_between(pose[0] - pose[6], pose[7] - pose[6])
        angles['right_hip_angle'] = angle_between(pose[0] - pose[12], pose[13] - pose[12])
        
        # 膝关节角度
        angles['left_knee_angle'] = angle_between(pose[6] - pose[7], pose[8] - pose[7])
        angles['right_knee_angle'] = angle_between(pose[12] - pose[13], pose[14] - pose[13])
        
        return angles
    
    def _calculate_basketball_specific(self, pose: np.ndarray) -> Dict[str, float]:
        """计算篮球专项指标"""
        metrics = {}
        up, left_to_right, front = compute_body_basis(pose)
        
        if np.linalg.norm(up) < 1e-6:
            return metrics
        
        # 确保向量是正确的形状
        up = up.flatten()
        left_to_right = left_to_right.flatten()
        front = front.flatten()
        
        # 手腕位置（用于动作识别）
        left_wrist = pose[5]
        right_wrist = pose[11]
        shoulder_center = (pose[3] + pose[9]) / 2
        hip_center = (pose[6] + pose[12]) / 2
        
        # 确保向量形状正确进行点积运算
        left_wrist_height = float(np.dot(left_wrist - shoulder_center, up))
        right_wrist_height = float(np.dot(right_wrist - shoulder_center, up))
        metrics['wrist_height'] = max(left_wrist_height, right_wrist_height)
        
        # 运球频率（基于手腕垂直运动幅度和频率）
        if len(self.prev_wrist_heights) > 0:
            # 计算手腕垂直运动幅度
            wrist_movement = abs(metrics['wrist_height'] - self.prev_wrist_heights[-1])
            # 累积运动幅度来估算运球频率
            if len(self.prev_wrist_heights) >= 5:
                recent_movements = [abs(self.prev_wrist_heights[i] - self.prev_wrist_heights[i-1]) 
                                   for i in range(1, min(6, len(self.prev_wrist_heights)))]
                avg_movement = sum(recent_movements) / len(recent_movements)
                # 运球频率基于运动幅度和频率
                metrics['dribble_frequency'] = min(avg_movement * 15, 8.0)  # 调整系数，限制最大值
            else:
                metrics['dribble_frequency'] = min(wrist_movement * 10, 5.0)
        else:
            metrics['dribble_frequency'] = 0.0
        
        # 重心高度（相对于肩膀）
        shoulder_center = (pose[3] + pose[9]) / 2
        body_height = float(np.dot(shoulder_center - hip_center, up))
        metrics['center_of_mass'] = body_height
        
        # 垂直速度（基于重心变化）
        if len(self.prev_body_heights) > 0:
            height_change = body_height - self.prev_body_heights[-1]
            metrics['vertical_velocity'] = height_change * 30  # 假设30fps
        else:
            metrics['vertical_velocity'] = 0.0
        
        # 身体前倾角度（运球姿态指标）
        chest_point = (pose[3] + pose[9] + pose[6] + pose[12]) / 4  # 躯干中心
        forward_lean = float(np.dot(chest_point - hip_center, front))
        metrics['body_lean'] = forward_lean
        
        # 膝盖弯曲程度（运球稳定性指标）
        left_knee_angle = angle_between(pose[6] - pose[7], pose[8] - pose[7])
        right_knee_angle = angle_between(pose[12] - pose[13], pose[14] - pose[13])
        metrics['knee_flexion'] = (left_knee_angle + right_knee_angle) / 2
        
        # 手臂展开程度（防守/控球指标）
        arm_span = joint_distance(left_wrist, right_wrist)
        shoulder_span = joint_distance(pose[3], pose[9])
        metrics['arm_extension'] = arm_span / shoulder_span if shoulder_span > 0 else 1.0
        
        # 投篮准确度评估（基于多个因素）
        shooting_score = self._evaluate_shooting_accuracy(pose, up, front, left_to_right)
        metrics['shooting_accuracy'] = shooting_score
        
        return metrics
    
    def _evaluate_shooting_accuracy(self, pose: np.ndarray, up: np.ndarray, 
                                  front: np.ndarray, left_to_right: np.ndarray) -> float:
        """评估投篮准确度（0-100分）"""
        score = 0.0
        
        # 确保向量是正确的形状
        up = up.flatten()
        left_to_right = left_to_right.flatten()
        front = front.flatten()
        
        # 因素1：手腕高度（越高越好）
        left_wrist = pose[5]
        right_wrist = pose[11]
        shoulder_center = (pose[3] + pose[9]) / 2
        
        left_wrist_height = float(np.dot(left_wrist - shoulder_center, up))
        right_wrist_height = float(np.dot(right_wrist - shoulder_center, up))
        max_wrist_height = max(left_wrist_height, right_wrist_height)
        
        if max_wrist_height > 0.3:
            score += 20
        elif max_wrist_height > 0.2:
            score += 12
        elif max_wrist_height > 0.1:
            score += 4
        
        # 因素2：肘部角度（应该在合理范围内）
        left_elbow_angle = angle_between(pose[3] - pose[4], pose[5] - pose[4])
        right_elbow_angle = angle_between(pose[9] - pose[10], pose[11] - pose[10])
        avg_elbow_angle = (left_elbow_angle + right_elbow_angle) / 2
        
        if 80 <= avg_elbow_angle <= 120:
            score += 20
        elif 60 <= avg_elbow_angle <= 140:
            score += 12
        elif 40 <= avg_elbow_angle <= 160:
            score += 4
        
        # 因素3：身体平衡（肩膀水平程度）
        shoulder_tilt = abs(float(np.dot(pose[9] - pose[3], left_to_right)))
        if shoulder_tilt < 0.05:
            score += 20
        elif shoulder_tilt < 0.1:
            score += 12
        elif shoulder_tilt < 0.15:
            score += 4
        
        # 因素4：出手方向（应该向前）
        hip_center = (pose[6] + pose[12]) / 2
        release_forward = float(np.dot(right_wrist - hip_center, front))
        if release_forward > 0.1:
            score += 20
        elif release_forward > 0.05:
            score += 12
        elif release_forward > 0:
            score += 4
        
        # 因素5：身体稳定性（膝盖弯曲程度）
        left_knee_angle = angle_between(pose[6] - pose[7], pose[8] - pose[7])
        right_knee_angle = angle_between(pose[12] - pose[13], pose[14] - pose[13])
        avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
        
        if 100 <= avg_knee_angle <= 130:  # 适度的膝盖弯曲
            score += 20
        elif 80 <= avg_knee_angle <= 150:
            score += 12
        else:
            score += 4
        
        return min(score, 100.0)
    
    def _calculate_defense_metrics(self, pose: np.ndarray) -> Dict[str, float]:
        """计算防守专项指标"""
        metrics = {}
        up, left_to_right, front = compute_body_basis(pose)
        
        if np.linalg.norm(up) < 1e-6:
            return metrics
        
        # 确保向量形状正确
        up = up.flatten()
        left_to_right = left_to_right.flatten()
        front = front.flatten()
        
        hip_center = (pose[6] + pose[12]) / 2
        shoulder_center = (pose[3] + pose[9]) / 2
        
        # 1. 重心起伏（防守时保持低重心很重要）
        body_height = float(np.dot(shoulder_center - hip_center, up))
        metrics['defense_center_fluctuation'] = body_height
        
        # 2. 胳膊张开情况（手臂展开程度）
        left_wrist = pose[5]
        right_wrist = pose[11]
        left_shoulder = pose[3]
        right_shoulder = pose[9]
        
        arm_span = joint_distance(left_wrist, right_wrist)
        shoulder_span = joint_distance(left_shoulder, right_shoulder)
        metrics['arm_spread_ratio'] = arm_span / shoulder_span if shoulder_span > 0 else 1.0
        
        # 计算手臂的实际张开距离（厘米，假设肩宽约为40cm）
        metrics['arm_spread_distance'] = arm_span * 40.0 / shoulder_span if shoulder_span > 0 else 40.0
        
        # 3. 双腿张开程度
        left_ankle = pose[8]
        right_ankle = pose[14]
        
        leg_span = joint_distance(left_ankle, right_ankle)
        metrics['leg_spread_ratio'] = leg_span / shoulder_span if shoulder_span > 0 else 1.0
        
        # 计算双腿实际张开距离（厘米）
        metrics['leg_spread_distance'] = leg_span * 40.0 / shoulder_span if shoulder_span > 0 else 40.0
        
        # 4. 膝盖弯曲程度（防守姿态）
        left_knee_angle = angle_between(pose[6] - pose[7], pose[8] - pose[7])
        right_knee_angle = angle_between(pose[12] - pose[13], pose[14] - pose[13])
        metrics['defense_knee_angle'] = (left_knee_angle + right_knee_angle) / 2
        
        # 5. 身体平衡性（通过肩膀水平度评估）
        shoulder_level = abs(float(np.dot(right_shoulder - left_shoulder, up)))
        metrics['body_balance'] = 1.0 - min(shoulder_level / 0.2, 1.0)  # 归一化到0-1
        
        return metrics
    
    def _calculate_shooting_metrics(self, pose: np.ndarray) -> Dict[str, float]:
        """计算投篮专项指标"""
        metrics = {}
        up, left_to_right, front = compute_body_basis(pose)
        
        if np.linalg.norm(up) < 1e-6:
            return metrics
        
        # 确保向量形状正确
        up = up.flatten()
        left_to_right = left_to_right.flatten()
        front = front.flatten()
        
        # 使用右手作为主投篮手（可根据需要改为左手或自动检测）
        right_shoulder = pose[9]
        right_elbow = pose[10]
        right_wrist = pose[11]
        
        left_shoulder = pose[3]
        left_elbow = pose[4]
        left_wrist = pose[5]
        
        hip_center = (pose[6] + pose[12]) / 2
        shoulder_center = (pose[3] + pose[9]) / 2
        
        # 1. 胳膊的弯曲角度（肘关节角度）
        right_elbow_angle = angle_between(right_shoulder - right_elbow, right_wrist - right_elbow)
        left_elbow_angle = angle_between(left_shoulder - left_elbow, left_wrist - left_elbow)
        metrics['shooting_elbow_angle'] = right_elbow_angle  # 主手
        metrics['shooting_support_elbow_angle'] = left_elbow_angle  # 辅助手
        
        # 2. 手腕的角度（手腕相对于前臂的角度）
        # 通过肘部和手腕的相对位置来估算
        forearm_vector = right_wrist - right_elbow
        upper_arm_vector = right_elbow - right_shoulder
        
        # 手腕翘起程度（通过前臂与上臂的夹角变化来估算）
        metrics['wrist_extension_angle'] = angle_between(upper_arm_vector, forearm_vector)
        
        # 3. 大臂与身体的角度（肩关节角度）
        # 计算大臂与躯干的夹角
        torso_vector = shoulder_center - hip_center
        metrics['upper_arm_body_angle'] = angle_between(torso_vector, upper_arm_vector)
        
        # 4. 手腕高度（投篮出手点）
        wrist_height = float(np.dot(right_wrist - shoulder_center, up))
        metrics['shooting_release_height'] = wrist_height
        
        # 5. 身体垂直度（投篮时身体应保持垂直）
        body_tilt = abs(float(np.dot(shoulder_center - hip_center, front)))
        metrics['shooting_body_alignment'] = 1.0 - min(body_tilt / 0.2, 1.0)  # 归一化
        
        # 6. 双手协调性（辅助手位置）
        hand_distance = joint_distance(left_wrist, right_wrist)
        shoulder_span = joint_distance(left_shoulder, right_shoulder)
        metrics['hand_coordination'] = hand_distance / shoulder_span if shoulder_span > 0 else 0
        
        return metrics
    
    def _update_history(self, pose: np.ndarray):
        """更新历史数据用于计算动态指标"""
        up, _, _ = compute_body_basis(pose)
        
        if np.linalg.norm(up) < 1e-6:
            return
        
        # 记录手腕高度
        left_wrist = pose[5]
        right_wrist = pose[11]
        shoulder_center = (pose[3] + pose[9]) / 2
        
        left_wrist_height = float(np.dot(left_wrist - shoulder_center, up))
        right_wrist_height = float(np.dot(right_wrist - shoulder_center, up))
        max_wrist_height = max(left_wrist_height, right_wrist_height)
        
        self.prev_wrist_heights.append(max_wrist_height)
        if len(self.prev_wrist_heights) > 10:
            self.prev_wrist_heights.pop(0)
        
        # 记录身体高度
        hip_center = (pose[6] + pose[12]) / 2
        shoulder_center = (pose[3] + pose[9]) / 2
        body_height = joint_distance(shoulder_center, hip_center)
        
        self.prev_body_heights.append(body_height)
        if len(self.prev_body_heights) > 10:
            self.prev_body_heights.pop(0)
    
    def get_phase_suggestions(self, metrics: Dict[str, float]) -> List[str]:
        """根据指标给出训练建议"""
        suggestions = []
        
        # 投篮建议
        if metrics.get('wrist_height', 0) < 0.2:
            suggestions.append("投篮时提高手腕高度，增加出手点")
        
        if metrics.get('right_elbow_angle', 90) < 60 or metrics.get('right_elbow_angle', 90) > 140:
            suggestions.append("调整肘部角度，保持在80-120度范围内")
        
        # 运球建议
        if metrics.get('dribble_frequency', 0) < 1.0:
            suggestions.append("增加运球频率，提高控球稳定性")
        elif metrics.get('dribble_frequency', 0) > 4.0:
            suggestions.append("运球频率过高，注意控制节奏")
        
        # 身体姿态建议
        if metrics.get('body_lean', 0) < 0.05:
            suggestions.append("运球时适当前倾，保持身体平衡")
        elif metrics.get('body_lean', 0) > 0.2:
            suggestions.append("身体前倾过度，注意保持直立")
        
        # 膝盖弯曲建议
        if metrics.get('knee_flexion', 120) > 150:
            suggestions.append("膝盖弯曲过度，适当伸直提高稳定性")
        elif metrics.get('knee_flexion', 120) < 90:
            suggestions.append("膝盖弯曲不足，适当弯曲降低重心")
        
        # 手臂展开建议
        if metrics.get('arm_extension', 1.0) < 0.8:
            suggestions.append("手臂展开不足，注意控球空间")
        
        # 重心建议
        if metrics.get('center_of_mass', 0) > 0.5:
            suggestions.append("降低重心，提高身体稳定性")
        
        # 弹跳建议
        if metrics.get('vertical_velocity', 0) < 0.1:
            suggestions.append("加强腿部力量训练，提高弹跳高度")
        
        return suggestions