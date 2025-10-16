import math

import cv2
import numpy as np


previous_position = []
theta, phi = 3.1415 / 4, -3.1415 / 6
should_rotate = False
scale_dx = 800
scale_dy = 800


class Plotter3d:
    SKELETON_EDGES = np.array([[11, 10], [10, 9], [9, 0], [0, 3], [3, 4], [4, 5], [0, 6], [6, 7], [7, 8], [0, 12],
                               [12, 13], [13, 14], [0, 1], [1, 15], [15, 16], [1, 17], [17, 18]])

    def __init__(self, canvas_size, origin=(0.5, 0.5), scale=1):
        self.origin = np.array([origin[1] * canvas_size[1], origin[0] * canvas_size[0]], dtype=np.float32)  # x, y
        self.scale = np.float32(scale)
        self.theta = 0
        self.phi = 0
        axis_length = 200
        axes = [
            np.array([[-axis_length/2, -axis_length/2, 0], [axis_length/2, -axis_length/2, 0]], dtype=np.float32),
            np.array([[-axis_length/2, -axis_length/2, 0], [-axis_length/2, axis_length/2, 0]], dtype=np.float32),
            np.array([[-axis_length/2, -axis_length/2, 0], [-axis_length/2, -axis_length/2, axis_length]], dtype=np.float32)]
        step = 20
        for step_id in range(axis_length // step + 1):  # add grid
            axes.append(np.array([[-axis_length / 2, -axis_length / 2 + step_id * step, 0],
                                  [axis_length / 2, -axis_length / 2 + step_id * step, 0]], dtype=np.float32))
            axes.append(np.array([[-axis_length / 2 + step_id * step, -axis_length / 2, 0],
                                  [-axis_length / 2 + step_id * step, axis_length / 2, 0]], dtype=np.float32))
        self.axes = np.array(axes)

    def plot(self, img, vertices, edges, injury_warning):
        global theta, phi
        img.fill(0)
        R = self._get_rotation(theta, phi)
        self._draw_axes(img, R)
        if len(edges) != 0:
            self._plot_edges(img, vertices, edges, R, injury_warning)

    def _draw_axes(self, img, R):
        axes_2d = np.dot(self.axes, R)
        axes_2d = axes_2d * self.scale + self.origin
        for axe in axes_2d:
            axe = axe.astype(int)
            cv2.line(img, tuple(axe[0]), tuple(axe[1]), (128, 128, 128), 1, cv2.LINE_AA)

    def _plot_edges(self, img, vertices, edges, R, injury_warning):
        vertices_2d = np.dot(vertices, R)
        edges_vertices = vertices_2d.reshape((-1, 2))[edges] * self.scale + self.origin

        for edge_vertices in edges_vertices:
            edge_vertices = edge_vertices.astype(int)
            cv2.line(img, tuple(edge_vertices[0]), tuple(edge_vertices[1]), (255, 255, 255), 1, cv2.LINE_AA)

        # print(tuple(vertices_2d[0][0].astype(int) * self.scale + self.origin))
        # 显示各个关节点的受伤风险状态
        for p in range(0, vertices_2d.shape[0]):
            for i in range(0, vertices_2d.shape[1]):
                # print(injury_warning[p][i])
                # print(tuple(vertices_2d[p][i].astype(int)))
                if injury_warning[p][i] is True:
                    # print("I should draw a big red circle! ")
                    cv2.circle(img, tuple((vertices_2d[p][i] * self.scale + self.origin).astype(int)), radius=3,
                               color=(0, 0, 255), thickness=-1, lineType=cv2.LINE_AA)
                else:
                    cv2.circle(img, tuple((vertices_2d[p][i] * self.scale + self.origin).astype(int)), radius=1,
                               color=(255, 0, 0), thickness=-1, lineType=cv2.LINE_AA)


    def _get_rotation(self, theta, phi):
        sin, cos = math.sin, math.cos
        return np.array([
            [ cos(theta),  sin(theta) * sin(phi)],
            [-sin(theta),  cos(theta) * sin(phi)],
            [ 0,                       -cos(phi)]
        ], dtype=np.float32)  # transposed

    @staticmethod
    def mouse_callback(event, x, y, flags, params):
        global previous_position, theta, phi, should_rotate, scale_dx, scale_dy
        if event == cv2.EVENT_LBUTTONDOWN:
            previous_position = [x, y]
            should_rotate = True
        if event == cv2.EVENT_MOUSEMOVE and should_rotate:
            theta += (x - previous_position[0]) / scale_dx * 6.2831  # 360 deg
            phi -= (y - previous_position[1]) / scale_dy * 6.2831 * 2  # 360 deg
            phi = max(min(3.1415 / 2, phi), -3.1415 / 2)
            previous_position = [x, y]
        if event == cv2.EVENT_LBUTTONUP:
            should_rotate = False


body_edges = np.array(
    [
        [0, 1],  # neck - nose
        [1, 16],
        [16, 18],  # nose - l_eye - l_ear
        [1, 15],
        [15, 17],  # nose - r_eye - r_ear
        [0, 3],
        [3, 4],
        [4, 5],  # neck - l_shoulder - l_elbow - l_wrist
        [0, 9],
        [9, 10],
        [10, 11],  # neck - r_shoulder - r_elbow - r_wrist
        [0, 6],
        [6, 7],
        [7, 8],  # neck - l_hip - l_knee - l_ankle
        [0, 12],
        [12, 13],
        [13, 14],
    ]
)  # number 2 represents NOTHING


# 关节分区，用于设定颜色
HEAD_SET = {1, 15, 16, 17, 18}
TORSO_SET = {0, 2}
LEFT_ARM_SET = {3, 4, 5}
RIGHT_ARM_SET = {9, 10, 11}
LEFT_LEG_SET = {6, 7, 8}
RIGHT_LEG_SET = {12, 13, 14}

SEGMENT_COLORS = {
    "head": (250, 235, 215),
    "torso": (255, 180, 90),
    "left_arm": (255, 120, 120),
    "right_arm": (120, 200, 255),
    "left_leg": (120, 255, 180),
    "right_leg": (255, 200, 130),
}


def _find_segment_color(idx_a: int, idx_b: int) -> tuple[int, int, int]:
    groups = [
        (HEAD_SET, "head"),
        (TORSO_SET, "torso"),
        (LEFT_ARM_SET, "left_arm"),
        (RIGHT_ARM_SET, "right_arm"),
        (LEFT_LEG_SET, "left_leg"),
        (RIGHT_LEG_SET, "right_leg"),
    ]
    for group, label in groups:
        if idx_a in group and idx_b in group:
            return SEGMENT_COLORS[label]
    return (255, 220, 150)


def _joint_color(idx: int) -> tuple[int, int, int]:
    if idx in HEAD_SET:
        return SEGMENT_COLORS["head"]
    if idx in LEFT_ARM_SET:
        return SEGMENT_COLORS["left_arm"]
    if idx in RIGHT_ARM_SET:
        return SEGMENT_COLORS["right_arm"]
    if idx in LEFT_LEG_SET:
        return SEGMENT_COLORS["left_leg"]
    if idx in RIGHT_LEG_SET:
        return SEGMENT_COLORS["right_leg"]
    return SEGMENT_COLORS["torso"]


def draw_poses(img, poses_2d):
    if len(poses_2d) == 0:
        return

    height, width = img.shape[:2]
    overlay = img.copy()

    # 背景轻微加深，突出骨架
    tint = np.full_like(img, (12, 24, 36))
    cv2.addWeighted(img, 0.82, tint, 0.18, 0, img)

    # 根据分辨率动态计算粗细
    base_scale = max(1, min(height, width) / 480)
    line_thickness = max(2, int(3 * base_scale))
    joint_radius = max(4, int(5 * base_scale))
    halo_radius = joint_radius + max(2, int(2 * base_scale))

    for pose_id in range(len(poses_2d)):
        pose = np.array(poses_2d[pose_id][0:-1]).reshape((-1, 3)).transpose()
        was_found = pose[2, :] > 0

        for edge in body_edges:
            if was_found[edge[0]] and was_found[edge[1]]:
                color = _find_segment_color(edge[0], edge[1])
                start_pt = tuple(pose[0:2, edge[0]].astype(int))
                end_pt = tuple(pose[0:2, edge[1]].astype(int))
                cv2.line(overlay, start_pt, end_pt, color, line_thickness, cv2.LINE_AA)

        for kpt_id in range(pose.shape[1]):
            if pose[2, kpt_id] == -1:
                continue
            point = tuple(pose[0:2, kpt_id].astype(int))
            color = _joint_color(kpt_id)
            cv2.circle(overlay, point, halo_radius, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(overlay, point, joint_radius, color, -1, cv2.LINE_AA)

    cv2.addWeighted(overlay, 0.85, img, 0.15, 0, img)
