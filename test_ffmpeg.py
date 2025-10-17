#!/usr/bin/env python3
"""测试FFmpeg转码功能"""

import sys
import os
from pathlib import Path

# 添加multi_scene_monitoring到路径
sys.path.append(str(Path(__file__).parent / "multi_scene_monitoring"))

from api_server import transcode_video_to_h264

def test_ffmpeg_function():
    """测试FFmpeg转码功能"""
    print("测试FFmpeg转码功能...")
    
    # 创建一个测试视频路径（不存在的文件）
    test_path = Path("test_video.mp4")
    
    # 测试FFmpeg是否可用
    success, message = transcode_video_to_h264(test_path)
    
    if "找不到 ffmpeg" in message:
        print("❌ FFmpeg未找到")
        return False
    elif "待转码的视频文件不存在" in message:
        print("✅ FFmpeg已找到并可用（测试文件不存在是正常的）")
        return True
    else:
        print(f"⚠️  其他错误: {message}")
        return False

if __name__ == "__main__":
    if test_ffmpeg_function():
        print("\n🎉 FFmpeg配置成功！视频转码功能应该可以正常工作了。")
    else:
        print("\n❌ FFmpeg配置失败，请检查安装。")