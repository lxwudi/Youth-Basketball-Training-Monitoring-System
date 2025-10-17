# 课堂坐姿识别场景说明

## 目标

- 实时监测学生坐姿和头部朝向，识别弯腰、趴桌、分心等状态。
- 根据关节角度与姿态稳定度给出提醒或矫正建议。

## 当前状态

- 已提供基于 3D 姿态的**趴桌检测器**（`analyzer.py`）。它会根据躯干前倾角、头部高度与双手高度判断学生是否可能趴在桌面上，输出 “leaning on desk” 提示。
- 暂无课堂实拍视频，可使用原项目中的样例视频验证算法流程，并在环境搭建完成后替换为实际摄像头/录制数据。
- 核心姿态估计、目标跟踪与角度分析模块在上级目录中已经准备好。

## 建议步骤

1. 启动程序时设置课堂场景并指定输入源：
   ```powershell
   $env:SCENE = "classroom"
   $env:FAST3DHP_SOURCE = "multi_scene_monitoring/data/yy_fall.mp4"  # 或课堂视频
   python multi_scene_monitoring/main.py
   ```
2. 若需要额外的阈值或规则，可在 `analyzer.py` 中调整参数（如 `lean_threshold`、`min_confidence`）或扩展更多特征。
3. 将未来采集的课堂视频集中放入：
   ```
   scenes/classroom/
   └─ data/
      ├─ raw_videos/
      └─ annotations/ (可选)
   ```
4. 如需与教室硬件联动（语音提醒、电子班牌），可复用 `usbcanlib/` 或扩展新的通信接口。

## TODO

- 制定课堂动作标签与提醒策略。
- 在 `analyzer.py` 中补充低头、离座等更多姿态识别规则，或接入学习型模型。
- 实现专用于坐姿统计与报表输出的脚本或模块。
