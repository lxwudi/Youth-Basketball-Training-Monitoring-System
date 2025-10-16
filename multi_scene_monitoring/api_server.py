"""Flask API服务器，用于处理视频上传和姿态识别"""

import os
import json
import cv2
import numpy as np
import re
import mimetypes
import subprocess
import shutil
from typing import Tuple, Optional, Dict, Any, List
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path
import tempfile
import uuid
from datetime import datetime

from modules.inference_engine_pytorch import InferenceEnginePyTorch
from modules.parse_poses import parse_poses
from modules.draw import draw_poses
from scenes.basketball.metrics_calculator import BasketballMetricsCalculator

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 添加CORS头到所有响应
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

PROJECT_ROOT = Path(__file__).resolve().parent
UPLOAD_FOLDER = PROJECT_ROOT / 'uploads'
OUTPUT_FOLDER = PROJECT_ROOT / 'outputs'
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)

# 配置
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['OUTPUT_FOLDER'] = str(OUTPUT_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 最大500MB

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

# 加载模型
model_path = str(PROJECT_ROOT / 'human-pose-estimation-3d.pth')
pose_net = InferenceEnginePyTorch(model_path, 'GPU', use_tensorrt=False)

# 存储处理任务状态
processing_tasks = {}

# 存储学员信息（实际应用中应使用数据库）
students_db = [
    {"id": "student-001", "name": "李明", "parentId": "parent-001", "age": 14, "class": "初一（3）班"},
    {"id": "student-002", "name": "王芳", "parentId": "parent-002", "age": 15, "class": "初二（1）班"},
    {"id": "student-003", "name": "张伟", "parentId": "parent-003", "age": 14, "class": "初一（2）班"},
    {"id": "student-004", "name": "刘洋", "parentId": "parent-004", "age": 16, "class": "初三（4）班"},
    {"id": "student-005", "name": "陈雪", "parentId": "parent-005", "age": 15, "class": "初二（3）班"},
]

# 存储训练报告（实际应用中应使用数据库）
training_reports_db = {}

# 存储家长接收的报告（实际应用中应使用数据库）
parent_reports_db = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def transcode_video_to_h264(input_path: Path) -> Tuple[bool, Optional[str]]:
    """使用 FFmpeg 将视频转码为浏览器友好的 H.264 Baseline 格式。

    返回 (success, error_message)。成功时 error_message 为 None。
    """
    ffmpeg_path = shutil.which('ffmpeg')
    if not ffmpeg_path:
        return False, '找不到 ffmpeg，请确认已经安装并加入 PATH'

    input_path = Path(input_path)
    if not input_path.exists():
        return False, '待转码的视频文件不存在'

    temp_output = input_path.with_name(f"{input_path.stem}_h264{input_path.suffix}")
    if temp_output.exists():
        temp_output.unlink()

    command = [
        ffmpeg_path,
        '-y',
        '-i', str(input_path),
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        str(temp_output)
    ]

    result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0 or not temp_output.exists():
        if temp_output.exists():
            temp_output.unlink(missing_ok=True)
        return False, result.stderr.strip() or 'FFmpeg 转码失败'

    try:
        os.replace(temp_output, input_path)
    except Exception as exc:
        temp_output.unlink(missing_ok=True)
        return False, f'替换转码结果失败: {exc}'

    return True, None


def rotate_poses(poses_3d, R, t):
    """旋转3D姿态到标准坐标系"""
    R_inv = np.linalg.inv(R)
    for pose_id in range(len(poses_3d)):
        pose_3d = poses_3d[pose_id].reshape((-1, 4)).transpose()
        t_reshaped = t.reshape(3, 1)
        pose_3d[0:3, :] = np.dot(R_inv, pose_3d[0:3, :] - t_reshaped)
        poses_3d[pose_id] = pose_3d.transpose().reshape(-1)
    return poses_3d


def canonicalize_poses(poses_3d, R, t):
    """将3D姿态转换为标准形式"""
    if len(poses_3d) == 0:
        return []
    
    pose = poses_3d.copy()
    pose = rotate_poses(pose, R, t)
    pose_copy = pose.copy()
    x = pose_copy[:, 0::4]
    y = pose_copy[:, 1::4]
    z = pose_copy[:, 2::4]
    pose[:, 0::4], pose[:, 1::4], pose[:, 2::4] = -z, x, -y
    pose = pose.reshape(pose.shape[0], 19, -1)[:, :, 0:3]
    return pose


def process_video(video_path, task_id, training_type='dribbling'):
    """处理视频并生成带骨架的输出视频和指标数据"""
    try:
        # 更新任务状态
        processing_tasks[task_id]['status'] = 'processing'
        processing_tasks[task_id]['progress'] = 0
        
        # 读取摄像机外参
        extrinsics_path = PROJECT_ROOT / 'data' / 'extrinsics.json'
        with open(extrinsics_path, 'r') as f:
            extrinsics = json.load(f)
        R = np.array(extrinsics['R'], dtype=np.float32)
        t = np.array(extrinsics['t'], dtype=np.float32)
        
        # 打开视频
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError("无法打开视频文件")
        
        # 获取视频信息
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # 创建输出视频（使用兼容的编码器）
        output_video_path = OUTPUT_FOLDER / f"{task_id}_output.mp4"
        
        # 使用最兼容的编码器
        fourcc_options = [
            ('mp4v', 'MP4V'),  # MPEG-4编码 (最兼容)
            ('XVID', 'XVID'),  # Xvid编码
            ('MJPG', 'MJPEG'), # Motion JPEG
            ('DIVX', 'DIVX'),  # DivX编码
            ('avc1', 'H.264'),  # H.264编码 (如果可用)
        ]
        
        out = None
        for codec_str, codec_name in fourcc_options:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec_str)
                out = cv2.VideoWriter(str(output_video_path), fourcc, fps, (width, height))
                
                # 验证视频写入器是否成功初始化
                if out.isOpened():
                    print(f"Successfully initialized VideoWriter with {codec_name} codec")
                    break
                else:
                    out.release()
                    out = None
            except Exception as e:
                print(f"Failed to use {codec_name} codec: {e}")
                if out:
                    out.release()
                out = None
        
        if not out or not out.isOpened():
            raise RuntimeError("无法初始化视频编码器，请检查 OpenCV 和 FFmpeg 安装")
        
        # 创建指标计算器
        metrics_calculator = BasketballMetricsCalculator()
        
        # 存储所有帧的指标
        all_metrics = []
        frame_idx = 0
        
        # 关键点名称映射（与前端中文标注一致，按 panoptic 19 点顺序）
        kp_names = [
            '颈部', '鼻尖', '骨盆',
            '左肩', '左肘', '左腕',
            '左髋', '左膝', '左踝',
            '右肩', '右肘', '右腕',
            '右髋', '右膝', '右踝',
            '右眼', '左眼', '右耳', '左耳'
        ]

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # 姿态估计
            stride = 8
            base_height = 256
            input_scale = base_height / frame.shape[0]
            scaled_img = cv2.resize(frame, dsize=None, fx=input_scale, fy=input_scale)
            scaled_img = scaled_img[:, 0:scaled_img.shape[1] - (scaled_img.shape[1] % stride)]
            fx = np.float32(0.8 * frame.shape[1])
            
            inference_result = pose_net.infer(scaled_img)
            poses_3d, poses_2d = parse_poses(inference_result, input_scale, stride, fx, is_video=True)
            
            # 在图像上绘制骨架
            draw_poses(frame, poses_2d)
            
            # 计算指标
            frame_metrics = {
                'frame': frame_idx,
                'timestamp': frame_idx / fps,
                'people': []
            }
            
            if len(poses_3d) > 0:
                canonical_poses = canonicalize_poses(poses_3d, R, t)
                
                for person_idx, pose in enumerate(canonical_poses):
                    # 计算该人的所有指标
                    person_metrics = metrics_calculator.calculate_all_metrics(pose)
                    
                    # 根据训练类型筛选相关指标
                    if training_type == 'dribbling':
                        filtered_metrics = {
                            'dribble_frequency': person_metrics.get('dribble_frequency', 0),
                            'center_of_mass': person_metrics.get('center_of_mass', 0),
                            'left_wrist_angle': person_metrics.get('left_elbow_angle', 0),
                            'right_wrist_angle': person_metrics.get('right_elbow_angle', 0),
                            'left_elbow_angle': person_metrics.get('left_elbow_angle', 0),
                            'right_elbow_angle': person_metrics.get('right_elbow_angle', 0),
                            'left_shoulder_angle': person_metrics.get('left_shoulder_angle', 0),
                            'right_shoulder_angle': person_metrics.get('right_shoulder_angle', 0),
                            'left_knee_angle': person_metrics.get('left_knee_angle', 0),
                            'right_knee_angle': person_metrics.get('right_knee_angle', 0),
                        }
                    elif training_type == 'defense':
                        filtered_metrics = {
                            'defense_center_fluctuation': person_metrics.get('defense_center_fluctuation', 0),
                            'arm_spread_ratio': person_metrics.get('arm_spread_ratio', 0),
                            'arm_spread_distance': person_metrics.get('arm_spread_distance', 0),
                            'leg_spread_ratio': person_metrics.get('leg_spread_ratio', 0),
                            'leg_spread_distance': person_metrics.get('leg_spread_distance', 0),
                            'defense_knee_angle': person_metrics.get('defense_knee_angle', 0),
                            'body_balance': person_metrics.get('body_balance', 0),
                        }
                    elif training_type == 'shooting':
                        filtered_metrics = {
                            'shooting_elbow_angle': person_metrics.get('shooting_elbow_angle', 0),
                            'shooting_support_elbow_angle': person_metrics.get('shooting_support_elbow_angle', 0),
                            'wrist_extension_angle': person_metrics.get('wrist_extension_angle', 0),
                            'upper_arm_body_angle': person_metrics.get('upper_arm_body_angle', 0),
                            'shooting_release_height': person_metrics.get('shooting_release_height', 0),
                            'shooting_body_alignment': person_metrics.get('shooting_body_alignment', 0),
                            'hand_coordination': person_metrics.get('hand_coordination', 0),
                        }
                    else:
                        filtered_metrics = person_metrics
                    
                    # 提取该人的2D关键点（与 metrics 一起保存，供前端叠加绘制使用）
                    keypoints_list = []
                    try:
                        pose2d = np.array(poses_2d[person_idx][0:-1]).reshape((-1, 3))  # (19,3) => x,y,conf
                        for i, name in enumerate(kp_names):
                            x, y, conf = pose2d[i]
                            if conf == -1:
                                # 缺失关键点用占位，前端会自动跳过低置信度/缺失
                                keypoints_list.append({
                                    'name': name,
                                    'x': float(x if x != -1 else 0),
                                    'y': float(y if y != -1 else 0),
                                    'confidence': float(conf if conf != -1 else 0.0)
                                })
                            else:
                                keypoints_list.append({
                                    'name': name,
                                    'x': float(x),
                                    'y': float(y),
                                    'confidence': float(conf)
                                })
                    except Exception:
                        # 回退：如果解析失败则给空数组
                        keypoints_list = []

                    frame_metrics['people'].append({
                        'person_id': person_idx,
                        'metrics': filtered_metrics,
                        'keypoints': keypoints_list
                    })
            
            all_metrics.append(frame_metrics)
            
            # 写入输出视频
            out.write(frame)
            
            # 更新进度
            frame_idx += 1
            progress = int((frame_idx / total_frames) * 100)
            processing_tasks[task_id]['progress'] = progress
        
        # 释放资源
        cap.release()
        out.release()

        # 使用 FFmpeg 进行 H.264 转码，提高浏览器兼容性
        transcode_success, transcode_error = transcode_video_to_h264(output_video_path)
        if not transcode_success:
            print(f"[WARN] FFmpeg 转码失败: {transcode_error}")
        else:
            print("[INFO] 输出视频已成功转码为 H.264 baseline")
        
        # 保存指标数据
        metrics_path = OUTPUT_FOLDER / f"{task_id}_metrics.json"
        with open(metrics_path, 'w', encoding='utf-8') as f:
            json.dump(all_metrics, f, ensure_ascii=False, indent=2)
        
        # 更新任务状态
        processing_tasks[task_id]['status'] = 'completed'
        processing_tasks[task_id]['progress'] = 100
        processing_tasks[task_id]['output_video'] = str(output_video_path)
        processing_tasks[task_id]['metrics_file'] = str(metrics_path)
        processing_tasks[task_id]['transcode_success'] = transcode_success
        if transcode_error:
            processing_tasks[task_id]['transcode_error'] = transcode_error
        
        return True
        
    except Exception as e:
        processing_tasks[task_id]['status'] = 'failed'
        processing_tasks[task_id]['error'] = str(e)
        return False


@app.route('/api/upload', methods=['POST'])
def upload_video():
    """上传视频并开始处理"""
    if 'video' not in request.files:
        return jsonify({'error': '没有上传视频文件'}), 400
    
    file = request.files['video']
    training_type = request.form.get('training_type', 'dribbling')
    
    if file.filename == '':
        return jsonify({'error': '文件名为空'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式'}), 400
    
    # 生成唯一任务ID
    task_id = str(uuid.uuid4())
    
    # 保存上传的视频
    filename = secure_filename(file.filename)
    video_path = UPLOAD_FOLDER / f"{task_id}_{filename}"
    file.save(str(video_path))
    
    # 创建处理任务
    processing_tasks[task_id] = {
        'status': 'uploaded',
        'progress': 0,
        'video_path': str(video_path),
        'training_type': training_type
    }
    
    # 在后台处理视频（实际应用中应使用异步任务队列）
    import threading
    thread = threading.Thread(target=process_video, args=(video_path, task_id, training_type))
    thread.start()
    
    return jsonify({
        'task_id': task_id,
        'message': '视频上传成功，开始处理'
    }), 200


@app.route('/api/status/<task_id>', methods=['GET'])
def get_status(task_id):
    """获取处理状态"""
    if task_id not in processing_tasks:
        return jsonify({'error': '任务不存在'}), 404
    
    task = processing_tasks[task_id]
    response = {
        'task_id': task_id,
        'status': task['status'],
        'progress': task['progress']
    }
    
    if task['status'] == 'failed':
        response['error'] = task.get('error', '未知错误')
    
    return jsonify(response), 200


@app.route('/api/result/<task_id>', methods=['GET'])
def get_result(task_id):
    """获取处理结果（指标数据）"""
    if task_id not in processing_tasks:
        return jsonify({'error': '任务不存在'}), 404
    
    task = processing_tasks[task_id]
    
    if task['status'] != 'completed':
        return jsonify({'error': '任务尚未完成'}), 400
    
    # 读取指标数据
    metrics_path = task['metrics_file']
    with open(metrics_path, 'r', encoding='utf-8') as f:
        metrics = json.load(f)
    
    return jsonify({
        'task_id': task_id,
        'metrics': metrics
    }), 200


@app.route('/api/pose-sequence/<task_id>', methods=['GET'])
def get_pose_sequence(task_id):
    """获取骨架序列数据（用于前端VideoPlayerWithOverlay组件）"""
    # 首先检查内存中的任务
    if task_id in processing_tasks:
        task = processing_tasks[task_id]
        if task['status'] != 'completed':
            return jsonify({'error': '任务尚未完成'}), 400
        metrics_path = task['metrics_file']
        video_path = task.get('output_video') or task.get('video_path')
    else:
        # 如果内存中没有，尝试从文件系统加载
        metrics_path = OUTPUT_FOLDER / f"{task_id}_metrics.json"
        if not metrics_path.exists():
            return jsonify({'error': '任务不存在'}), 404
        # 推断视频路径（优先输出视频，其次原视频）
        cand_output = OUTPUT_FOLDER / f"{task_id}_output.mp4"
        if cand_output.exists():
            video_path = str(cand_output)
        else:
            # 查找上传原视频
            matches = list(UPLOAD_FOLDER.glob(f"{task_id}_*"))
            video_path = str(matches[0]) if matches else None
    
    # 读取指标数据
    with open(metrics_path, 'r', encoding='utf-8') as f:
        metrics = json.load(f)
    
    # 读取视频信息: 尝试从真实视频获取 fps/尺寸
    frame_rate = 30.0
    size = {"width": 1280, "height": 720}
    if video_path and os.path.exists(video_path):
        try:
            cap = cv2.VideoCapture(video_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            if fps and fps > 0:
                frame_rate = float(fps)
            if w > 0 and h > 0:
                size = {"width": w, "height": h}
            cap.release()
        except Exception:
            pass

    # 生成骨架序列数据（符合前端期望的格式）
    pose_sequence = {
        "videoSource": f"{task_id}_output.mp4",
        "frameRate": frame_rate,
        "size": size,
        "frames": []
    }
    
    # 将指标数据转换为骨架序列格式
    for frame_data in metrics:
        # 取第一人的关键点（若存在），否则空
        first_person = frame_data.get("people", [{}])[:1]
        person = first_person[0] if first_person else {}
        keypoints = person.get("keypoints") or []
        frame = {
            "time": frame_data.get("timestamp", 0.0),
            "keypoints": keypoints if isinstance(keypoints, list) else [],
            "metrics": person.get("metrics", {})
        }
        pose_sequence["frames"].append(frame)
    
    return jsonify(pose_sequence), 200


def generate_mock_keypoints():
    # 兼容老数据的兜底（尽量不再使用）
    return []


@app.route('/api/video/<task_id>', methods=['GET'])
def get_video(task_id):
    """获取处理后的视频文件（支持范围请求）"""
    # 允许任务不在内存的情况：尝试直接从输出目录读取
    if task_id in processing_tasks:
        task = processing_tasks[task_id]
        if task['status'] != 'completed':
            return jsonify({'error': '任务尚未完成'}), 400
        video_path = task.get('output_video')
    else:
        cand = OUTPUT_FOLDER / f"{task_id}_output.mp4"
        video_path = str(cand) if cand.exists() else None
    
    # 检查文件是否存在
    if not video_path or not os.path.exists(video_path):
        return jsonify({'error': '视频文件不存在，可能是处理过程中出现错误'}), 404
    
    # 支持范围请求以实现视频流式播放
    file_size = os.path.getsize(video_path)
    range_header = request.headers.get('Range', None)
    
    if not range_header:
        # 没有范围请求，返回整个文件
        return send_file(
            video_path,
            mimetype='video/mp4',
            as_attachment=False,
            download_name=f'{task_id}_output.mp4'
        )
    
    # 解析范围请求
    byte_start, byte_end = 0, file_size - 1
    match = re.search(r'bytes=(\d+)-(\d*)', range_header)
    if match:
        groups = match.groups()
        if groups[0]:
            byte_start = int(groups[0])
        if groups[1]:
            byte_end = int(groups[1])
    
    # 确保范围有效
    byte_end = min(byte_end, file_size - 1)
    length = byte_end - byte_start + 1
    
    # 读取指定范围的数据
    with open(video_path, 'rb') as f:
        f.seek(byte_start)
        data = f.read(length)
    
    # 返回部分内容
    response = Response(
        data,
        206,  # Partial Content
        mimetype='video/mp4',
        content_type='video/mp4',
        direct_passthrough=True
    )
    response.headers.add('Content-Range', f'bytes {byte_start}-{byte_end}/{file_size}')
    response.headers.add('Accept-Ranges', 'bytes')
    response.headers.add('Content-Length', str(length))
    response.headers.add('Cache-Control', 'no-cache')
    
    return response


@app.route('/api/raw-video/<task_id>', methods=['GET'])
def get_raw_video(task_id):
    """获取原始上传的视频文件（支持范围请求，浏览器更高兼容性）"""
    # 优先从内存任务中获取
    if task_id in processing_tasks:
        video_path = processing_tasks[task_id].get('video_path')
    else:
        # 从文件系统中查找
        matches = list(UPLOAD_FOLDER.glob(f"{task_id}_*"))
        video_path = str(matches[0]) if matches else None

    if not video_path or not os.path.exists(video_path):
        return jsonify({'error': '原始视频不存在'}), 404

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get('Range', None)

    if not range_header:
        mime_type, _ = mimetypes.guess_type(video_path)
        return send_file(
            video_path,
            mimetype=mime_type or 'application/octet-stream',
            as_attachment=False,
            download_name=os.path.basename(video_path)
        )

    byte_start, byte_end = 0, file_size - 1
    match = re.search(r'bytes=(\d+)-(\d*)', range_header)
    if match:
        groups = match.groups()
        if groups[0]:
            byte_start = int(groups[0])
        if groups[1]:
            byte_end = int(groups[1])
    byte_end = min(byte_end, file_size - 1)
    length = byte_end - byte_start + 1

    with open(video_path, 'rb') as f:
        f.seek(byte_start)
        data = f.read(length)

    mime_type, _ = mimetypes.guess_type(video_path)
    response = Response(
        data,
        206,
        mimetype=mime_type or 'application/octet-stream',
        content_type=mime_type or 'application/octet-stream',
        direct_passthrough=True
    )
    response.headers.add('Content-Range', f'bytes {byte_start}-{byte_end}/{file_size}')
    response.headers.add('Accept-Ranges', 'bytes')
    response.headers.add('Content-Length', str(length))
    response.headers.add('Cache-Control', 'no-cache')
    return response


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'ok'}), 200


def call_deepseek_api(training_type: str, metrics_summary: Dict[str, Any]) -> Dict[str, Any]:
    """调用DeepSeek大模型API进行视频分析
    
    Args:
        training_type: 训练类型 (shooting/dribbling/defense)
        metrics_summary: 指标摘要数据
    
    Returns:
        AI分析结果
    """
    import requests
    
    # 从环境变量读取API密钥
    api_key = os.environ.get('DEEPSEEK_API_KEY', '')
    
    if not api_key:
        print("[WARN] DEEPSEEK_API_KEY not set, using mock response")
        return generate_mock_ai_analysis(training_type, metrics_summary)
    
    # DeepSeek API配置
    api_url = "https://api.deepseek.com/v1/chat/completions"
    
    # 根据训练类型生成不同的提示词
    training_prompts = {
        'shooting': '投篮动作分析：请根据投篮训练指标数据，分析运动员的投篮姿势，包括肘部角度、手腕角度、出手高度等。',
        'dribbling': '运球动作分析：请根据运球训练指标数据，分析运动员的运球技巧，包括运球频率、重心控制、关节角度等。',
        'defense': '防守动作分析：请根据防守训练指标数据，分析运动员的防守姿态，包括重心稳定性、手臂张开程度、膝盖弯曲等。'
    }
    
    prompt = f"""{training_prompts.get(training_type, '训练动作分析')}

指标数据摘要：
{json.dumps(metrics_summary, ensure_ascii=False, indent=2)}

请提供：
1. 整体评价（summary）：2-3句话总结训练表现
2. 改进建议（suggestions）：3-5条具体的改进建议
3. 需要改进的方面（improvementAreas）：3-5个关键改进点
4. 优势方面（strengths）：2-3个表现较好的方面
5. 综合评分（overallScore）：0-100分的评分

请以JSON格式返回，格式如下：
{{
  "summary": "整体评价文本",
  "suggestions": ["建议1", "建议2", "建议3"],
  "improvementAreas": ["改进点1", "改进点2", "改进点3"],
  "strengths": ["优势1", "优势2"],
  "overallScore": 75
}}
"""
    
    try:
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': 'deepseek-chat',
            'messages': [
                {
                    'role': 'system',
                    'content': '你是一位专业的篮球训练分析师，擅长分析运动员的训练数据并给出专业建议。'
                },
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'temperature': 0.7,
            'max_tokens': 1000
        }
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # 尝试从返回内容中提取JSON
            try:
                # 查找JSON代码块
                json_start = content.find('{')
                json_end = content.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    json_str = content[json_start:json_end]
                    analysis_result = json.loads(json_str)
                    return analysis_result
                else:
                    # 如果没有找到JSON，使用模拟数据
                    return generate_mock_ai_analysis(training_type, metrics_summary)
            except json.JSONDecodeError:
                print(f"[WARN] Failed to parse DeepSeek response as JSON: {content}")
                return generate_mock_ai_analysis(training_type, metrics_summary)
        else:
            print(f"[ERROR] DeepSeek API error: {response.status_code} - {response.text}")
            return generate_mock_ai_analysis(training_type, metrics_summary)
            
    except Exception as e:
        print(f"[ERROR] DeepSeek API call failed: {e}")
        return generate_mock_ai_analysis(training_type, metrics_summary)


def generate_mock_ai_analysis(training_type: str, metrics_summary: Dict[str, Any]) -> Dict[str, Any]:
    """生成模拟的AI分析结果（当DeepSeek API不可用时使用）"""
    
    mock_responses = {
        'shooting': {
            'summary': '整体投篮姿势较为规范，出手点高度适中，但手腕角度和肘部角度还有改进空间。建议加强基本功训练，注意投篮时的身体协调性。',
            'suggestions': [
                '保持投篮时肘部角度在90-100度之间，确保出手更加稳定',
                '注意手腕的延展角度，出手时手腕应充分后仰以增加球的旋转',
                '练习投篮时保持身体垂直，避免前倾或后仰',
                '加强双手协调性训练，辅助手应适当支撑球而不影响主手发力',
                '提高出手点高度，可以减少被封盖的可能性'
            ],
            'improvementAreas': [
                '手腕延展角度需要改进',
                '肘部角度稳定性不足',
                '身体垂直度控制',
                '双手协调性'
            ],
            'strengths': [
                '出手点高度保持较好',
                '投篮节奏稳定',
                '基本动作规范'
            ],
            'overallScore': 72
        },
        'dribbling': {
            'summary': '运球基本功扎实，节奏控制较好，但重心起伏较大，需要加强下肢力量和重心控制训练。手腕和手肘的灵活性表现良好。',
            'suggestions': [
                '降低重心，保持身体重心稳定，减少不必要的上下起伏',
                '加强腿部力量训练，特别是股四头肌和小腿肌群',
                '练习时注意保持膝盖适当弯曲，角度控制在110-130度之间',
                '提高运球频率，目标达到每秒3-4次以上',
                '加强非惯用手的运球训练，提高左右手协调性'
            ],
            'improvementAreas': [
                '重心起伏控制',
                '膝盖角度稳定性',
                '下肢力量',
                '运球频率'
            ],
            'strengths': [
                '手腕灵活性好',
                '手肘角度控制良好',
                '运球节奏感强'
            ],
            'overallScore': 68
        },
        'defense': {
            'summary': '防守姿态基本到位，手臂张开程度较好，但重心稳定性需要提升。膝盖弯曲角度适中，建议加强横向移动训练和核心力量。',
            'suggestions': [
                '加强核心力量训练，提高身体平衡性和稳定性',
                '保持膝盖弯曲角度，避免站得过直或蹲得过低',
                '练习防守滑步时，保持重心低且稳定',
                '加强手臂力量和耐力，保持防守手臂始终张开',
                '提高横向移动速度，增强防守时的反应能力'
            ],
            'improvementAreas': [
                '重心稳定性',
                '身体平衡度',
                '横向移动能力',
                '防守持久性'
            ],
            'strengths': [
                '手臂张开程度好',
                '膝盖弯曲角度合理',
                '防守意识强'
            ],
            'overallScore': 70
        }
    }
    
    return mock_responses.get(training_type, mock_responses['shooting'])


def calculate_metrics_summary(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """计算指标摘要统计"""
    if not metrics or len(metrics) == 0:
        return {}
    
    # 收集所有指标的值
    metric_values = {}
    for frame in metrics:
        if 'people' in frame and len(frame['people']) > 0:
            person_metrics = frame['people'][0].get('metrics', {})
            for key, value in person_metrics.items():
                if key not in metric_values:
                    metric_values[key] = []
                if isinstance(value, (int, float)) and not np.isnan(value):
                    metric_values[key].append(float(value))
    
    # 计算统计值
    summary = {}
    for key, values in metric_values.items():
        if values:
            summary[key] = {
                'mean': float(np.mean(values)),
                'std': float(np.std(values)),
                'min': float(np.min(values)),
                'max': float(np.max(values)),
                'count': len(values)
            }
    
    return summary


@app.route('/api/ai-analysis', methods=['POST'])
def ai_analysis():
    """AI分析训练视频指标"""
    try:
        data = request.get_json()
        training_type = data.get('trainingType')
        metrics = data.get('metrics', [])
        
        if not training_type or not metrics:
            return jsonify({'error': '缺少必要参数'}), 400
        
        # 计算指标摘要
        metrics_summary = calculate_metrics_summary(metrics)
        
        # 调用DeepSeek API
        analysis_result = call_deepseek_api(training_type, metrics_summary)
        
        return jsonify(analysis_result), 200
        
    except Exception as e:
        print(f"[ERROR] AI analysis failed: {e}")
        return jsonify({
            'error': 'AI分析失败',
            'message': str(e)
        }), 500


@app.route('/api/students', methods=['GET'])
def get_students():
    """获取学员列表"""
    return jsonify(students_db), 200


@app.route('/api/training-reports', methods=['POST'])
def create_training_report():
    """生成训练报告"""
    try:
        data = request.get_json()
        student_id = data.get('studentId')
        student_name = data.get('studentName')
        training_type = data.get('trainingType')
        analysis_result = data.get('analysisResult')
        metrics = data.get('metrics', [])
        
        if not all([student_id, student_name, training_type, analysis_result]):
            return jsonify({'error': '缺少必要参数'}), 400
        
        # 生成报告ID
        report_id = str(uuid.uuid4())
        
        # 创建报告
        report = {
            'id': report_id,
            'studentId': student_id,
            'studentName': student_name,
            'trainingType': training_type,
            'analysisResult': analysis_result,
            'metrics': metrics,
            'timestamp': datetime.now().isoformat(),
            'sentToParent': False
        }
        
        # 保存报告
        training_reports_db[report_id] = report
        
        return jsonify(report), 200
        
    except Exception as e:
        print(f"[ERROR] Create training report failed: {e}")
        return jsonify({
            'error': '生成训练报告失败',
            'message': str(e)
        }), 500


@app.route('/api/send-report-to-parent', methods=['POST'])
def send_report_to_parent():
    """发送训练报告到家长端"""
    try:
        data = request.get_json()
        report_id = data.get('reportId')
        parent_id = data.get('parentId')
        
        if not report_id or not parent_id:
            return jsonify({'error': '缺少必要参数'}), 400
        
        # 检查报告是否存在
        if report_id not in training_reports_db:
            return jsonify({'error': '报告不存在'}), 404
        
        # 获取报告
        report = training_reports_db[report_id]
        
        # 标记报告已发送
        report['sentToParent'] = True
        
        # 保存到家长端
        if parent_id not in parent_reports_db:
            parent_reports_db[parent_id] = []
        
        parent_reports_db[parent_id].append({
            'reportId': report_id,
            'receivedAt': datetime.now().isoformat()
        })
        
        return jsonify({
            'success': True,
            'message': '训练报告已成功发送到家长端'
        }), 200
        
    except Exception as e:
        print(f"[ERROR] Send report to parent failed: {e}")
        return jsonify({
            'error': '发送报告失败',
            'message': str(e)
        }), 500


@app.route('/api/students/<student_id>/reports', methods=['GET'])
def get_student_reports(student_id):
    """获取学员的训练报告列表"""
    try:
        # 筛选该学员的报告
        reports = [
            report for report in training_reports_db.values()
            if report['studentId'] == student_id
        ]
        
        # 按时间倒序排序
        reports.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify(reports), 200
        
    except Exception as e:
        print(f"[ERROR] Get student reports failed: {e}")
        return jsonify([]), 200


if __name__ == '__main__':
    print("Starting Flask API server...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Output folder: {OUTPUT_FOLDER}")
    
    # 检查DeepSeek API密钥
    if os.environ.get('DEEPSEEK_API_KEY'):
        print("DeepSeek API key found - AI analysis enabled")
    else:
        print("[WARN] DEEPSEEK_API_KEY not set - using mock AI analysis")
        print("To enable real AI analysis, set DEEPSEEK_API_KEY environment variable")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
