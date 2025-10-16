# 篮球动作识别场景说明

## 目标

- 识别球员的关键动作（防守、投篮、突破等）。
- 结合 3D 姿态与关节角度分析运动风险、动作规范性。

## 当前状态

- 已提供基于 3D 姿态的**投篮姿态检测器**（`analyzer.py`）。当手臂高举、肘部弯曲角在合理区间且双手靠近时，会在界面上提示 “shooting posture”。
- 暂无专属篮球视频数据。可临时使用 `../../运动员监测系统/运动员监测系统/video/in/` 中的样例比赛视频进行流程验证。
- 核心算法在 `../../` 目录下的 `main.py`、`modules/` 等已准备就绪，可直接调用。

## 建议步骤

1. 启动程序时添加环境变量启用篮球场景：
   ```powershell
   $env:SCENE = "basketball"
   $env:FAST3DHP_SOURCE = "multi_scene_monitoring/data/yy_fall.mp4"  # 或你的体育视频
   python multi_scene_monitoring/main.py
   ```
2. 将样例视频路径写入自定义脚本（例如 `basketball_demo.py`）或直接修改 `main.py` 中的视频来源。
3. 根据需要，在 `modules/` 中扩展关节角度阈值，以匹配篮球动作的安全范围。
4. 后续取得真实篮球数据后，在本目录下新建 `data/` 并整理：
   ```
   scenes/basketball/
   ├─ data/
   │   ├─ raw_videos/
   │   └─ annotations/ (可选)
   └─ README.md
   ```
5. 若需要专门的可视化或导出逻辑，可在本目录中新建脚本，复用 `modules/` 提供的 API。

## TODO

- 收集篮球训练视频及标注。
- 在 `analyzer.py` 中持续迭代投篮/突破/防守等动作规则或引入学习型模型。
- 设计动作评分或预警规则，并与 UI/后端对接。
