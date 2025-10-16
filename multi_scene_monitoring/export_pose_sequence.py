"""Utility script to run the 3D pose model on a recorded video and export
per-frame 2D keypoints and basketball metrics for the front-end overlay."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np

from main import PoseTracker3D
from scenes.basketball.metrics_calculator import BasketballMetricsCalculator

PROJECT_ROOT = Path(__file__).resolve().parent


def _calculate_adaptive_stride(total_frames: int, fps: float, duration: float) -> int:
    """根据视频特性自适应计算帧间隔"""
    # 目标：保持合理的处理帧数，同时保证时间分辨率
    target_frames = min(300, max(100, duration * 10))  # 每秒10帧，但限制在100-300帧之间
    
    if total_frames <= target_frames:
        return 1  # 短视频不需要跳帧
    
    stride = max(1, total_frames // target_frames)
    
    # 根据视频长度调整策略
    if duration < 5:  # 短视频，保持高时间分辨率
        stride = min(stride, 2)
    elif duration < 15:  # 中等长度视频
        stride = min(stride, 3)
    else:  # 长视频，可以适当跳帧
        stride = min(stride, 5)
    
    return stride


POSE_NAME_MAP: Dict[int, str] = {
    0: "颈部",
    1: "鼻尖",
    2: "脊柱",
    3: "左肩",
    4: "左肘",
    5: "左腕",
    6: "左髋",
    7: "左膝",
    8: "左踝",
    9: "右肩",
    10: "右肘",
    11: "右腕",
    12: "右髋",
    13: "右膝",
    14: "右踝",
    15: "右眼",
    16: "左眼",
    17: "右耳",
    18: "左耳",
}


@dataclass
class FrameKeypoints:
    time: float
    keypoints: List[Dict[str, float]]
    metrics: Dict[str, float]


def _convert_pose_to_keypoints(
    pose: np.ndarray,
    *,
    confidence_threshold: float,
) -> Dict[str, Dict[str, float]]:
    """Convert a raw pose array into a name -> keypoint mapping."""
    keypoints: Dict[str, Dict[str, float]] = {}
    num_kpts = (pose.shape[0] - 1) // 3
    for idx in range(num_kpts):
        name = POSE_NAME_MAP.get(idx)
        if name is None:
            continue
        x = float(pose[idx * 3])
        y = float(pose[idx * 3 + 1])
        conf = float(pose[idx * 3 + 2])
        if conf < 0 or (confidence_threshold is not None and conf < confidence_threshold):
            continue
        keypoints[name] = {"x": x, "y": y, "confidence": conf}
    return keypoints


def _add_derived_points(keypoints: Dict[str, Dict[str, float]]) -> None:
    left_hip = keypoints.get("左髋")
    right_hip = keypoints.get("右髋")
    if left_hip and right_hip:
        keypoints.setdefault(
            "骨盆",
            {
                "x": (left_hip["x"] + right_hip["x"]) / 2,
                "y": (left_hip["y"] + right_hip["y"]) / 2,
                "confidence": (left_hip["confidence"] + right_hip["confidence"]) / 2,
            },
        )
    neck = keypoints.get("颈部")
    pelvis = keypoints.get("骨盆")
    if neck and pelvis:
        keypoints.setdefault(
            "脊柱",
            {
                "x": (neck["x"] + pelvis["x"]) / 2,
                "y": (neck["y"] + pelvis["y"]) / 2,
                "confidence": (neck["confidence"] + pelvis["confidence"]) / 2,
            },
        )


def export_sequence(
    video_path: Path,
    output_path: Path,
    *,
    frame_stride: int,
    confidence_threshold: float,
    max_frames: Optional[int],
) -> None:
    tracker = PoseTracker3D(show_windows=False)
    metrics_calculator = BasketballMetricsCalculator()
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"无法打开视频源: {video_path}")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 30.0)
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    video_duration = total_frames / fps

    # 自适应参数调整
    if frame_stride == 2:  # 使用默认值时才自适应
        frame_stride = _calculate_adaptive_stride(total_frames, fps, video_duration)
    
    print(f"视频信息: {total_frames}帧, {fps:.2f}FPS, {video_duration:.2f}秒")
    print(f"使用帧间隔: {frame_stride} (预计处理约{total_frames//frame_stride}帧)")

    frames: List[FrameKeypoints] = []
    frame_index = 0
    exported = 0

    while True:
        success, frame = capture.read()
        if not success:
            break
        if frame_stride > 1 and frame_index % frame_stride != 0:
            frame_index += 1
            continue

        poses_3d, poses_2d = tracker.run_model(frame)
        if poses_2d.size == 0:
            frames.append(FrameKeypoints(time=frame_index / fps, keypoints=[], metrics={}))
        else:
            best_pose_idx = int(np.argmax(poses_2d[:, -1]))
            pose_2d = poses_2d[best_pose_idx]
            pose_3d = poses_3d[best_pose_idx] if poses_3d.size > 0 else None
            
            keypoints_map = _convert_pose_to_keypoints(pose_2d, confidence_threshold=confidence_threshold)
            if keypoints_map:
                _add_derived_points(keypoints_map)
            
            # 计算篮球专项指标
            metrics = {}
            if pose_3d is not None:
                try:
                    canonical_pose = tracker.canonicalize(pose_3d.reshape(1, -1))
                    if canonical_pose is not None and len(canonical_pose) > 0:
                        metrics = metrics_calculator.calculate_all_metrics(canonical_pose[0])
                except Exception as e:
                    print(f"Warning: Could not calculate metrics for frame {frame_index}: {e}")
                    metrics = {}
            
            frames.append(
                FrameKeypoints(
                    time=frame_index / fps,
                    keypoints=[
                        {
                            "name": name,
                            "x": round(values["x"], 2),
                            "y": round(values["y"], 2),
                            "confidence": round(values["confidence"], 3),
                        }
                        for name, values in sorted(keypoints_map.items())
                    ],
                    metrics={k: round(v, 3) for k, v in metrics.items()},
                )
            )

        exported += 1
        frame_index += 1
        if max_frames and exported >= max_frames:
            break

    capture.release()

    output_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "videoSource": str(video_path.name),
        "frameRate": fps,
        "size": {"width": width, "height": height},
        "totalFrames": len(frames),
        "frames": [
            {
                "time": round(frame.time, 3), 
                "keypoints": frame.keypoints,
                "metrics": frame.metrics
            }
            for frame in frames
        ],
    }

    with output_path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False)
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="导出视频中的关键点轨迹，供前端骨架叠加使用")
    parser.add_argument(
        "video",
        type=Path,
        help="要解析的视频文件路径 (相对路径将基于 multi_scene_monitoring 目录)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "export" / "pose_sequence.json",
        help="输出 JSON 文件路径",
    )
    parser.add_argument(
        "--frame-stride",
        type=int,
        default=2,  # 改为默认2，让自适应算法生效
        help="逐帧下采样间隔，默认为 2 (自适应调整)",
    )
    parser.add_argument(
        "--confidence-threshold",
        type=float,
        default=0.2,
        help="过滤低置信度关键点的阈值",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=None,
        help="最多处理的帧数，默认处理全部帧",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    video_path = args.video if args.video.is_absolute() else PROJECT_ROOT / args.video
    if not video_path.exists():
        raise FileNotFoundError(f"未找到视频文件: {video_path}")
    output_path = args.output if args.output.is_absolute() else PROJECT_ROOT / args.output

    export_sequence(
        video_path,
        output_path,
        frame_stride=max(1, args.frame_stride),
        confidence_threshold=max(0.0, args.confidence_threshold),
        max_frames=args.max_frames,
    )
    print(f"关键点数据已导出: {output_path}")


if __name__ == "__main__":
    main()
