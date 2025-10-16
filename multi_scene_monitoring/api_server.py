"""Flask API服务器，用于处理视频上传和姿态识别"""

import os
import json
import cv2
import numpy as np
import re
import mimetypes
import subprocess
import shutil
from typing import Tuple, Optional
from flask import Flask, request, jsonify, send_file, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path
import tempfile
import uuid

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


if __name__ == '__main__':
    print("Starting Flask API server...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Output folder: {OUTPUT_FOLDER}")
    app.run(host='0.0.0.0', port=5000, debug=True)
