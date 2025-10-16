import  os, time, datetime, copy, random, math, cv2
import json
import numpy as np
from collections import deque
import threading
import matplotlib.pyplot as plt
from multiprocessing import Process, Pipe, Queue
from queue import Empty
import torch
from usbcanlib.USBCANBase import USBCAN

from ultralytics import YOLO

from PIL import Image, ImageFont, ImageDraw
from pathlib import Path

from modules.draw import Plotter3d, draw_poses
from modules.parse_poses import parse_poses
from scenes.scene_loader import load_analyzer, summarize_detections


PROJECT_ROOT = Path(__file__).resolve().parent
REMOTE_STREAM_PREFIXES = ('rtsp://', 'http://', 'https://')


def _env_flag(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


def _normalize_video_candidate(candidate):
    if candidate is None:
        return None
    if isinstance(candidate, int):
        return candidate
    if isinstance(candidate, Path):
        path_candidate = candidate
    else:
        candidate_str = str(candidate).strip().strip('"').strip("'")
        if not candidate_str:
            return None
        if candidate_str.lstrip('-').isdigit():
            return int(candidate_str)
        lowered = candidate_str.lower()
        if any(lowered.startswith(prefix) for prefix in REMOTE_STREAM_PREFIXES):
            return candidate_str
        path_candidate = Path(candidate_str)
    if not path_candidate.is_absolute():
        path_candidate = PROJECT_ROOT / path_candidate
    if path_candidate.exists():
        return str(path_candidate)
    return None


def build_candidate_sources(preferred=None, env_vars=None, allow_default_video=False):
    candidates = []
    if env_vars:
        if isinstance(env_vars, str):
            env_vars = [env_vars]
        for env_var in env_vars:
            env_value = os.getenv(env_var)
            if env_value:
                candidates.append(env_value)
    global_override = os.getenv('VIDEO_SOURCE')
    if global_override:
        candidates.append(global_override)
    if preferred is not None:
        candidates.append(preferred)
    if allow_default_video:
        default_video = PROJECT_ROOT / 'data' / 'yy_fall.mp4'
        if default_video.exists():
            candidates.append(default_video)

    normalized_sources = []
    for candidate in candidates:
        normalized = _normalize_video_candidate(candidate)
        if normalized is None:
            continue
        if normalized not in normalized_sources:
            normalized_sources.append(normalized)
    return normalized_sources


def rotate_poses(poses_3d, R, t):
    R_inv = np.linalg.inv(R)
    for pose_id in range(len(poses_3d)):
        pose_3d = poses_3d[pose_id].reshape((-1, 4)).transpose()
        # 确保t的形状正确进行广播
        t_reshaped = t.reshape(3, 1)  # 将t从(3,)重塑为(3,1)
        pose_3d[0:3, :] = np.dot(R_inv, pose_3d[0:3, :] - t_reshaped)
        poses_3d[pose_id] = pose_3d.transpose().reshape(-1)

    return poses_3d


def get_angle_3D(v1, v2):
    x = np.array(v1)
    y = np.array(v2)

    # 分别计算两个向量的模：
    module_x = np.sqrt(x.dot(x))
    module_y = np.sqrt(y.dot(y))

    # 计算两个向量的点积
    dot_value = x.dot(y)

    # 计算夹角的cos值：
    cos_theta = dot_value / (module_x * module_y)

    # 求得夹角（弧度制）：
    angle_radian = np.arccos(cos_theta)

    # 转换为角度值：
    angle_value = angle_radian*180/np.pi
    return angle_value


class PoseTracker3D:
    def __init__(self, *, show_windows=True):
        model_path = str(PROJECT_ROOT / 'human-pose-estimation-3d.pth')
        from modules.inference_engine_pytorch import InferenceEnginePyTorch
        self.net = InferenceEnginePyTorch(model_path, 'GPU', use_tensorrt=False)
        self.show_windows = show_windows

        # 加载3d画布
        self.canvas_3d = np.zeros((720, 1280, 3), dtype=np.uint8)
        self.plotter = Plotter3d(self.canvas_3d.shape[:2])
        self.canvas_3d_window_name = 'Canvas 3D'
        if self.show_windows:
            cv2.namedWindow(self.canvas_3d_window_name)
            cv2.moveWindow(self.canvas_3d_window_name, 50, 50)
            cv2.setMouseCallback(self.canvas_3d_window_name, Plotter3d.mouse_callback)
            cv2.namedWindow('ICV 3D Human Pose Estimation')
            cv2.moveWindow('ICV 3D Human Pose Estimation', 700, 50)

        # 读取摄像机外参
        file_path = str(PROJECT_ROOT / 'data' / 'extrinsics.json')
        with open(file_path, 'r') as f:
            extrinsics = json.load(f)
        self.R = np.array(extrinsics['R'], dtype=np.float32)
        self.t = np.array(extrinsics['t'], dtype=np.float32)

    def run_model(self, img):
        stride = 8
        base_height = 256  # base_height 默认值为256
        input_scale = base_height / img.shape[0]
        scaled_img = cv2.resize(img, dsize=None, fx=input_scale, fy=input_scale)
        scaled_img = scaled_img[:,
                          0:scaled_img.shape[1] - (scaled_img.shape[1] % stride)]  # better to pad, but cut out for demo
        fx = np.float32(0.8 * img.shape[1])
        inference_result = self.net.infer(scaled_img)
        poses_3d, poses_2d = parse_poses(inference_result, input_scale, stride, fx, is_video=True)
        return poses_3d, poses_2d

    def show_canvas_3d(self, poses_3d, injury_warning):
        edges = []
        if len(poses_3d):
            poses_3d = rotate_poses(poses_3d, self.R, self.t)
            poses_3d_copy = poses_3d.copy()
            x = poses_3d_copy[:, 0::4]
            y = poses_3d_copy[:, 1::4]
            z = poses_3d_copy[:, 2::4]
            poses_3d[:, 0::4], poses_3d[:, 1::4], poses_3d[:, 2::4] = -z, x, -y

            poses_3d = poses_3d.reshape(poses_3d.shape[0], 19, -1)[:, :, 0:3]
            edges = (Plotter3d.SKELETON_EDGES + 19 * np.arange(poses_3d.shape[0]).reshape((-1, 1, 1))).reshape((-1, 2))
        # print(edges)
        self.plotter.plot(self.canvas_3d, poses_3d, edges, injury_warning)
        if self.show_windows:
            cv2.imshow(self.canvas_3d_window_name, self.canvas_3d)

    def canvas_2d(self, poses_2d, mean_time, frame):
        draw_poses(frame, poses_2d)
        # print(frame.shape)
        cv2.putText(frame, 'FPS: {}'.format(int(1 / mean_time * 10) / 10),
                    (40, 80), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255))
        frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
        if self.show_windows:
            cv2.imshow('ICV 3D Human Pose Estimation', frame)

    def canonicalize(self, poses_3d):
        pose = copy.deepcopy(poses_3d)
        if len(pose):
            pose = rotate_poses(pose, self.R, self.t)
            pose_copy = pose.copy()
            x = pose_copy[:, 0::4]
            y = pose_copy[:, 1::4]
            z = pose_copy[:, 2::4]
            pose[:, 0::4], pose[:, 1::4], pose[:, 2::4] = -z, x, -y
            pose = pose.reshape(pose.shape[0], 19, -1)[:, :, 0:3]
            return pose
        return []

    def get_angle_warning(self, poses_3d, canonical_pose=None):
        pose = canonical_pose if canonical_pose is not None else self.canonicalize(poses_3d)
        if len(pose):
            # print(pose.shape)
            all_people_warning_list = []
            for i in range(0, pose.shape[0]):
                warning_list = [False for i in range(0, 19)]
                vector_body_up = pose[i][0] - (pose[i][6] + pose[i][12]) / 2
                vector_body_up = vector_body_up / np.linalg.norm(vector_body_up)
                vector_body_left_to_right = pose[i][9] - pose[i][3]
                vector_body_left_to_right = vector_body_left_to_right / np.linalg.norm(vector_body_left_to_right)
                vector_body_front = np.cross(vector_body_up, vector_body_left_to_right)
                vector_body_front = vector_body_front / np.linalg.norm(vector_body_front)
                # print(i, " vector_body_up", vector_body_up)
                # print(i, " vector_body_left_to_right", vector_body_left_to_right)
                # print(i, " vector_body_front", vector_body_front)

                angles = []
                angle_l_shoulder = get_angle_3D(pose[i][0] - pose[i][3], pose[i][4] - pose[i][3])
                angle_r_shoulder = get_angle_3D(pose[i][0] - pose[i][9], pose[i][10] - pose[i][9])
                angle_l_elbow = get_angle_3D(pose[i][3] - pose[i][4], pose[i][5] - pose[i][4])
                angle_r_elbow = get_angle_3D(pose[i][9] - pose[i][10], pose[i][11] - pose[i][10])
                angle_l_hip = get_angle_3D(pose[i][0] - pose[i][6], pose[i][7] - pose[i][6])
                angle_r_hip = get_angle_3D(pose[i][0] - pose[i][12], pose[i][13] - pose[i][12])
                angle_l_knee = get_angle_3D(pose[i][6] - pose[i][7], pose[i][8] - pose[i][7])
                angle_r_knee = get_angle_3D(pose[i][12] - pose[i][13], pose[i][14] - pose[i][13])
                angle_head_left = get_angle_3D(pose[i][1] - pose[i][0], pose[i][3] - pose[i][0])
                angle_head_right = get_angle_3D(pose[i][1] - pose[i][0], pose[i][9] - pose[i][0])

                angles = [angle_l_shoulder, angle_r_shoulder, angle_l_elbow, angle_r_elbow, angle_l_hip,
                              angle_r_hip, angle_l_knee, angle_r_knee, angle_head_left, angle_head_right]
                # print(i, "  angles: ", angles)

                # 篮球专用损伤预警
                # 投篮肩部损伤预警 - 检测过大的外展角度
                vector_front_right = vector_body_front + vector_body_left_to_right
                angle_r_shoulder_normal = get_angle_3D(pose[i][10] - pose[i][9], vector_front_right)
                if angle_r_shoulder_normal > 85:  # 篮球投篮时肩部外展角度阈值更严格
                    print("people ", i, " right shoulder may in danger (shooting)! ")
                    warning_list[9] = True

                vector_front_left = vector_body_front - vector_body_left_to_right
                angle_l_shoulder_normal = get_angle_3D(pose[i][4] - pose[i][3], vector_front_left)
                if angle_l_shoulder_normal > 85:
                    print("people ", i, " left shoulder may in danger (shooting)! ")
                    warning_list[3] = True

                # 篮球肘部损伤预警 - 投篮时肘部过度伸展或弯曲
                angle_r_elbow_arm = get_angle_3D(pose[i][9] - pose[i][10], pose[i][11] - pose[i][10])
                if angle_r_elbow_arm < 25 or angle_r_elbow_arm > 160:  # 篮球投篮肘部角度范围
                    print("people ", i, " right elbow may in danger (shooting)! ")
                    warning_list[10] = True

                angle_l_elbow_arm = get_angle_3D(pose[i][3] - pose[i][4], pose[i][5] - pose[i][4])
                if angle_l_elbow_arm < 25 or angle_l_elbow_arm > 160:
                    print("people ", i, " left elbow may in danger (shooting)! ")
                    warning_list[4] = True

                # 篮球髋关节损伤预警 - 跳跃落地时的髋部角度
                angle_r_hip_normal = get_angle_3D(pose[i][0] - pose[i][12], pose[i][13] - pose[i][12])
                angle_r_hip_front = get_angle_3D(vector_body_front, pose[i][13] - pose[i][12])
                if angle_r_hip_normal < 45 or angle_r_hip_front > 95:  # 跳跃落地时髋部角度
                    print("people ", i, " right hip may in danger (jumping)! ")
                    warning_list[12] = True

                angle_l_hip_normal = get_angle_3D(pose[i][0] - pose[i][6], pose[i][7] - pose[i][6])
                angle_l_hip_front = get_angle_3D(vector_body_front, pose[i][7] - pose[i][6])
                if angle_l_hip_normal < 45 or angle_l_hip_front > 95:
                    print("people ", i, " left hip may in danger (jumping)! ")
                    warning_list[6] = True

                # 篮球膝关节损伤预警 - 落地时膝盖角度和侧向稳定性
                angle_r_knee_normal = get_angle_3D(pose[i][12] - pose[i][13], pose[i][14] - pose[i][13])
                # 检测膝盖内扣/外翻
                knee_vector = pose[i][14] - pose[i][13]
                hip_vector = pose[i][12] - pose[i][13]
                knee_lateral_angle = get_angle_3D(knee_vector, hip_vector)
                
                if angle_r_knee_normal < 45 or knee_lateral_angle > 30:  # 落地时膝盖弯曲不足或侧向角度过大
                    print("people ", i, " right knee may in danger (landing)! ")
                    warning_list[13] = True

                angle_l_knee_normal = get_angle_3D(pose[i][6] - pose[i][7], pose[i][8] - pose[i][7])
                knee_vector_l = pose[i][8] - pose[i][7]
                hip_vector_l = pose[i][6] - pose[i][7]
                knee_lateral_angle_l = get_angle_3D(knee_vector_l, hip_vector_l)
                
                if angle_l_knee_normal < 45 or knee_lateral_angle_l > 30:
                    print("people ", i, " left knee may in danger (landing)! ")
                    warning_list[7] = True

                # 篮球踝关节损伤预警 - 落地时踝关节角度
                if i < len(pose) and len(pose[i]) > 14:
                    # 检测右踝关节
                    right_ankle_angle = get_angle_3D(pose[i][13] - pose[i][14], np.array([0, 1, 0]))  # 与垂直面的角度
                    if right_ankle_angle > 30:  # 踝关节过度背屈或跖屈
                        print("people ", i, " right ankle may in danger (landing)! ")
                        warning_list[14] = True

                    # 检测左踝关节
                    left_ankle_angle = get_angle_3D(pose[i][7] - pose[i][8], np.array([0, 1, 0]))
                    if left_ankle_angle > 30:
                        print("people ", i, " left ankle may in danger (landing)! ")
                        warning_list[8] = True

                all_people_warning_list.append(warning_list)

            return all_people_warning_list


font_faces = [
    cv2.FONT_HERSHEY_SIMPLEX,
    cv2.FONT_HERSHEY_PLAIN,
    cv2.FONT_HERSHEY_DUPLEX,
    cv2.FONT_HERSHEY_COMPLEX,
    cv2.FONT_HERSHEY_TRIPLEX,
    cv2.FONT_HERSHEY_COMPLEX_SMALL,
    cv2.FONT_HERSHEY_SCRIPT_SIMPLEX,
    cv2.FONT_HERSHEY_SCRIPT_COMPLEX,
    cv2.FONT_ITALIC
  ]

JOINT_WARNING_LABELS = {
    3: "left shoulder",
    4: "left elbow",
    5: "left wrist",
    7: "left knee",
    9: "right shoulder",
    10: "right elbow",
    11: "right wrist",
    13: "right knee",
}


class CameraCap(object):
    """ 打开视频流 """

    def __init__(self, source=0, *, env_vars=None, allow_default_video=False):

        candidates = build_candidate_sources(preferred=source, env_vars=env_vars, allow_default_video=allow_default_video)
        self.cap = None
        self.source = None
        for candidate in candidates:
            cap = cv2.VideoCapture(candidate)
            if cap.isOpened():
                self.cap = cap
                self.source = candidate
                break
            cap.release()

        if self.cap is None:
            raise IOError(f"Video source(s) unavailable: {candidates if candidates else source}")

        self.is_camera = isinstance(self.source, int)
        if self.is_camera:
            self.cap.set(cv2.CAP_PROP_FPS, 25) # 这个有时候生效，有时候不生效不知道是什么原因
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))

        print(f"[CameraCap] Using source: {self.source}")

    """ 图片信息打印 """

    def get_image_info(self, image):
        print(type(image))
        print(image.shape)
        print(image.size)
        print(image.dtype)
        pixel_data = np.array(image)
        print(pixel_data)

    """ 逐帧读取数据并保存图片到本地制定位置 """

    def Camera_image(self):
        i = 0
        while True:
            ret, frame = self.cap.read()  # ret：True或者False，代表有没有读取到图片;frame：表示截取到一帧的图片
            if ret == False:
                break

            self.get_image_info(frame) # print("打印图片信息") 注意：调试的时候可以打开，如果是一直运行程序，建议把这行代码注释掉，避免影响内存占用

            cv2.imshow('capture', frame)  # 展示图片

            mtime = datetime.datetime.now().strftime('%Y-%m-%d_%H_%M_%S')
            print(mtime)

            cv2.imwrite(r"./image/" + str(i) + str("-") + mtime + ".jpg", frame)  # 保存图片
            i = i + 1

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    def Camera_video(self):
        w = int(self.cap.get(3))  # 获取视频的width
        h = int(self.cap.get(4))  # 获取视频的height
        fourcc = cv2.VideoWriter_fourcc(*'MJPG')
        out = cv2.VideoWriter('output.avi', fourcc, 25.0, (w, h))

        while (self.cap.isOpened()):
            ret, frame = self.cap.read()
            if ret == True:
                frame = cv2.flip(frame, 1)
                out.write(frame)  # 保存视频
                cv2.imshow('frame', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            else:
                break

        self.cap.release()
        out.release()

    def get_frame(self):
        ret, frame = self.cap.read()
        return ret, frame


class FullSpeedVideoInput(Process):
    def __init__(self, connection, queue):
        Process.__init__(self)
        self._conn1, self._conn2 = connection
        self.queue = queue
        self.scene_name = os.getenv('SCENE', '').strip().lower()
        self.scenario_analyzer = None

    def run(self):
        # FIFO
        video_buffer = deque(maxlen=81)
        caption = CameraCap(source=2, env_vars=['FULLSPEED_SOURCE', 'FAST3DHP_SOURCE'], allow_default_video=True)

        # cv2.namedWindow('Current Capture')
        # cv2.moveWindow('Current Capture', 1800, 950)
        # cv2.namedWindow('Late Capture')
        # cv2.moveWindow('Late Capture', 500, 100)

        i = 0
        while True:
            ret, frame = caption.get_frame()
            if ret is False:
                break
            if i >= video_buffer.maxlen:
                video_buffer.popleft()
            video_buffer.append(frame)

            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            frame = cv2.resize(frame, None, fx=0.5, fy=0.5)
            # cv2.imshow('Current Capture', frame)  # 展示图片

            if len(video_buffer) >= 81:
                # cv2.imshow('Late Capture', cv2.rotate(cv2.resize(video_buffer[20], None, fx=0.5, fy=0.5), cv2.ROTATE_90_CLOCKWISE))
                # print("fullspeed: ", i)
                # global_latest_frame.value = i
                if i % 10 == 0:
                    self.queue.put(video_buffer[80])
                i = i + 1

            if cv2.waitKey(1) & 0xFF == 27:
                print("Saving videos")
                fourcc = cv2.VideoWriter_fourcc(*'MJPG')
                out = cv2.VideoWriter('output.avi', fourcc, 25.0, (1920, 1080))
                if len(video_buffer) >= 81:
                    for i in range(0, 81):
                        print("save frame ", i)
                        write_frame = video_buffer[i]
                        write_frame = cv2.flip(write_frame, 1)
                        out.write(write_frame)  # 保存视频
                        # out.release()
                self._conn2.send("Stop")
                break

        caption.cap.release()  # 释放对象和销毁窗口
        cv2.destroyAllWindows()


class Fast3DHP(Process):
    def __init__(self, connection, queue):
        Process.__init__(self)
        self._conn1, self._conn2 = connection
        self.queue = queue
        self.scene_name = os.getenv('SCENE', '').strip().lower()
        self.scenario_analyzer = None
        self._manual_close_poll_ms = 100

    def _wait_for_manual_close(self, window_names):
        active_windows = [name for name in window_names if name]
        if not active_windows:
            return
        print("[Fast3DHP] Waiting for manual window close (ESC or close button)...")
        while True:
            visible_window_found = False
            for name in active_windows:
                try:
                    if cv2.getWindowProperty(name, cv2.WND_PROP_VISIBLE) >= 1:
                        visible_window_found = True
                        break
                except cv2.error:
                    continue
            if not visible_window_found:
                break
            key = cv2.waitKey(self._manual_close_poll_ms)
            if key in (27, ord('q')):
                break
        for name in active_windows:
            try:
                cv2.destroyWindow(name)
            except cv2.error:
                pass
        cv2.destroyAllWindows()


    def run(self):
        # i = 0
        cv2.namedWindow("Injury Analysis", cv2.WINDOW_AUTOSIZE)
        cv2.moveWindow('Injury Analysis', 50, 550)
        mean_time = 0
        PoseTracker = PoseTracker3D()
        pose_angle_warning = []
        if self.scenario_analyzer is None and self.scene_name:
            self.scenario_analyzer = load_analyzer(self.scene_name)
            if self.scenario_analyzer:
                print(f"[Fast3DHP] Loaded scenario analyzer: {self.scenario_analyzer.name}")
        caption = CameraCap(source=2, env_vars='FAST3DHP_SOURCE', allow_default_video=True)
        while True:
            try:
                # frame__ = self.queue.get_nowait()
                # print(frame.shape)
                ret, frame = caption.get_frame()
                if ret is False:
                    break
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
                current_time = cv2.getTickCount()
                poses_3d, poses_2d = PoseTracker.run_model(frame)
                # print(poses_3d.shape, poses_2d.shape)

                canonical_poses = PoseTracker.canonicalize(poses_3d)
                pose_angle_warning = PoseTracker.get_angle_warning(poses_3d, canonical_pose=canonical_poses)
                scenario_detections = []
                if self.scenario_analyzer and len(canonical_poses):
                    scenario_detections = self.scenario_analyzer.analyze(canonical_poses, poses_3d, poses_2d)

                background = np.zeros((480, 640, 3)).astype(np.float32)
                overlay_lines = []
                if pose_angle_warning is not None and len(pose_angle_warning):
                    for person_idx, joint_flags in enumerate(pose_angle_warning):
                        for joint_idx, flagged in enumerate(joint_flags):
                            if flagged and joint_idx in JOINT_WARNING_LABELS:
                                label = JOINT_WARNING_LABELS[joint_idx]
                                overlay_lines.append(f"[#{person_idx}] Potential strain at {label}")

                scenario_lines = summarize_detections(scenario_detections)
                if scenario_lines:
                    if overlay_lines:
                        overlay_lines.append("------------------------------")
                    overlay_lines.extend(scenario_lines)

                if not overlay_lines:
                    overlay_lines.append("No warnings detected")

                baseline_y = 40
                for line in overlay_lines:
                    background = cv2.putText(background, line,
                                             (10, baseline_y), font_faces[0], 1, (255, 255, 255), 2,
                                             cv2.LINE_AA)
                    baseline_y += 40
                cv2.imshow("Injury Analysis", background)

                PoseTracker.show_canvas_3d(poses_3d, pose_angle_warning)

                current_time = (cv2.getTickCount() - current_time) / cv2.getTickFrequency()
                if mean_time == 0:
                    mean_time = current_time
                else:
                    mean_time = mean_time * 0.95 + current_time * 0.05
                PoseTracker.canvas_2d(poses_2d, mean_time, frame)

                key = cv2.waitKey(1)
                if key == 27:
                    break
            except Empty:
                pass
                # print(Empty)
            # print(i)
            # i = i + 1

            if self._conn1.poll():
                msg = self._conn1.recv()
                print(type(msg))
                if type(msg) == str:
                    if msg == "Stop":
                        break
            # time.sleep(0.3)

        caption.cap.release()
        window_names = [
            "Injury Analysis",
            getattr(PoseTracker, 'canvas_3d_window_name', None),
            'ICV 3D Human Pose Estimation',
        ]
        self._wait_for_manual_close(window_names)


class FastPoseTracker3D(Process):
    def __init__(self, queue):
        Process.__init__(self)
        self.queue = queue

    def run(self):
        caption = CameraCap(source=2, env_vars='FAST3DHP_SOURCE', allow_default_video=True)
        mean_time = 0

        PoseTracker = PoseTracker3D()
        while True:
            ret, frame = caption.get_frame()
            if ret is False:
                break
            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            current_time = cv2.getTickCount()
            poses_3d, poses_2d = PoseTracker.run_model(frame)
            print(poses_3d.shape, poses_2d.shape)
            PoseTracker.show_canvas_3d(poses_3d)

            current_time = (cv2.getTickCount() - current_time) / cv2.getTickFrequency()
            if mean_time == 0:
                mean_time = current_time
            else:
                mean_time = mean_time * 0.95 + current_time * 0.05
            PoseTracker.canvas_2d(poses_2d, mean_time, frame)

            key = cv2.waitKey(1)
            if key == 27:
                break

        caption.cap.release()
        cv2.destroyAllWindows()


class YoloGetMotorTrack(Process):
    def __init__(self, queue):
        Process.__init__(self)
        self.queue = queue
        self.current_pts = (0, 0)
        self.is_mouse_left_button_down = False
        self.is_mouse_left_button_up = False
        self.target_x = 0
        self.target_y = 0
        self.target_pitch_degree = 0  # 俯仰角
        self.target_yaw_degree = 0    # 偏航角

    def run(self):
        model = YOLO('yolov8n.pt')
        panoptic_camera = CameraCap(source=3, env_vars='PANORAMA_SOURCE')

        cv2.namedWindow('Panaroma')
        cv2.moveWindow('Panaroma', 100, 100)
        target_point = (0, 0)
        while True:
            ret, frame = panoptic_camera.get_frame()
            if ret is False:
                break
            frame = cv2.resize(frame, (960, 540))
            try:
                results = model.track(frame, persist=True)
                # print(results[0].boxes.cls.cpu().numpy().astype(int))
                boxes = results[0].boxes.xyxy.cpu().numpy().astype(int)
                classes = results[0].boxes.cls.cpu().numpy().astype(int)
                ids = results[0].boxes.id.cpu().numpy().astype(int)
                for box, id, cls in zip(boxes, ids, classes):
                    if cls != 0:
                        continue
                    cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        f"Id {id}",
                        (box[0], box[1]),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2,
                    )
            except:
                pass
            # frame = np.zeros((540, 960, 3))
            ptsx1 = (10, 270)
            ptsx2 = (960 - 10, 270)
            cv2.arrowedLine(frame, ptsx1, ptsx2, (255, 0, 0), tipLength=0.03)
            ptsy1 = (480, 540 - 10)
            ptsy2 = (480, 10)
            cv2.arrowedLine(frame, ptsy1, ptsy2, (0, 0, 255), tipLength=0.03)
            new_pitch, new_yaw = self.get_degree(self.target_x, self.target_y)
            if new_pitch != self.target_pitch_degree or new_yaw != self.target_yaw_degree:
                self.target_pitch_degree, self.target_yaw_degree = new_pitch, new_yaw
                degree_to_motor = (self.target_pitch_degree, self.target_yaw_degree)
                self.queue.put(degree_to_motor)

            cv2.putText(frame, "target_x: " + str(self.target_x), (10, 30), font_faces[0], 1, (255, 255, 255), 2,
                        cv2.LINE_AA)
            cv2.putText(frame, "target_y: " + str(self.target_y), (10, 60), font_faces[0], 1, (255, 255, 255), 2,
                        cv2.LINE_AA)
            cv2.putText(frame, "target_pitch: " + str(self.target_pitch_degree), (10, 90), font_faces[0], 1, (255, 255, 255), 2,
                        cv2.LINE_AA)
            cv2.putText(frame, "target_yaw: " + str(self.target_yaw_degree), (10, 120), font_faces[0], 1, (255, 255, 255), 2,
                        cv2.LINE_AA)
            if self.is_mouse_left_button_down:
                target_point = self.current_pts
                self.target_x = target_point[0] - 480
                self.target_y = 270 - target_point[1]
            cv2.circle(frame, target_point, 5, (255, 255, 255), 5)
            # cv2.imshow('Panaroma', cv2.resize(frame, None, fx=0.5, fy=0.5))
            cv2.imshow('Panaroma', frame)
            cv2.setMouseCallback('Panaroma', self.on_mouse_call_back)


            # time.sleep(0.05)

            if cv2.waitKey(1) & 0xFF == 27:
                cv2.destroyWindow('Panaroma')
                break

        panoptic_camera.cap.release()
        cv2.destroyAllWindows()


    def empty(v):
        pass

    def on_mouse_call_back(self, event, x, y, flags, params):
        if event == cv2.EVENT_LBUTTONDOWN:
            self.is_mouse_left_button_down = True
            self.is_mouse_left_button_up = False
            # print('pt1: x = %d, y = %d' % (x, y))

        if event == cv2.EVENT_LBUTTONUP:
            self.is_mouse_left_button_down = False
            self.is_mouse_left_button_up = True
            # print('pt2: x = %d, y = %d' % (x, y))

        if event == cv2.EVENT_LBUTTONDOWN:
            self.current_pts = (x, y)

    def get_degree(self, x, y):
        yaw = math.asin(x / 480) * 45
        pitch = math.asin(y / 270) * 30
        return int(pitch), int(yaw)


class MotorUSBCAN(Process):
    def __init__(self, queue):
        Process.__init__(self)
        self.queue = queue


    def run(self):
        usbcan = USBCAN(CanDLLName='./usbcanlib/ControlCAN.dll')
        usbcan.keyboardControl(self.queue)
        usbcan.close_CAN()



if __name__ == '__main__':
    image_queue = Queue()
    camera_track_queue = Queue()
    conn1, conn2 = Pipe(True)

    processes = []

    enable_usbcan = _env_flag('ENABLE_USBCAN', default=False)
    enable_panorama = _env_flag('ENABLE_PANORAMA', default=False)
    enable_fast3dhp = _env_flag('ENABLE_FAST3DHP', default=True)

    if enable_usbcan:
        dll_path = PROJECT_ROOT / 'usbcanlib' / 'ControlCAN.dll'
        if dll_path.exists():
            processUSBCAN = MotorUSBCAN(camera_track_queue)
            processUSBCAN.start()
            processes.append(processUSBCAN)
        else:
            print(f"[Main] Skip USBCAN: missing DLL at {dll_path}")

    if enable_panorama:
        try:
            processCameraTrack = YoloGetMotorTrack(camera_track_queue)
            processCameraTrack.start()
            processes.append(processCameraTrack)
        except IOError as exc:
            print(f"[Main] Skip panorama tracker: {exc}")

    if enable_fast3dhp:
        try:
            processFast3DHP = Fast3DHP((conn1, conn2), image_queue)
            processFast3DHP.start()
            processes.append(processFast3DHP)
        except IOError as exc:
            print(f"[Main] Skip Fast3DHP: {exc}")

    if not processes:
        print("[Main] No processes were started. Set ENABLE_FAST3DHP=1 or other flags to enable components.")

    try:
        for process in processes:
            process.join()
    except KeyboardInterrupt:
        print("[Main] Interrupted by user, terminating child processes...")
    finally:
        for process in processes:
            if process.is_alive():
                process.terminate()
        cv2.destroyAllWindows()






