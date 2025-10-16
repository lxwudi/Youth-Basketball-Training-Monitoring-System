# Multi-scene Activity Monitoring Core

本目录整合了原有“智护长者”与“运动员监测”项目中已经验证的算法与代码，可同时支撑以下两个新场景：

1. **篮球运动员动作识别与分析**
2. **课堂学生坐姿与专注度识别**

## 目录结构

```
multi_scene_monitoring/
├─ main.py                 # 系统入口，多进程调度
├─ modules/                # 姿态估计、绘制、角度分析等工具
├─ models/                 # 骨架网络定义
├─ data/                   # 摄像头标定示例（extrinsics.json）
├─ usbcanlib/              # USB-CAN 通信封装
├─ human-pose-estimation-3d.pth
├─ yolov8n.pt
├─ requirements_tiaobei.txt  # Python 依赖列表
└─ scenes/
   ├─ basketball/          # 球员分析场景说明与配置
   └─ classroom/           # 课堂坐姿场景说明与配置
```

## 运行说明

当前没有新的采集数据，可直接复用旧项目中的样例视频与数据集进行验证：

- **视频数据**：`../运动员监测系统/运动员监测系统/video/in/` 目录下的足球比赛视频，可暂时代替球员类场景输入。
- **其他资源**：如需要 YOLO 样例输出或姿态分析结果，可参考 `../运动员监测系统/运动员监测系统/output/` 与 `runs/`。

### 环境准备

1. 安装 Python 3.8+。
2. 建议使用虚拟环境（conda / venv）。
3. 安装依赖：
   ```powershell
   pip install -r requirements_tiaobei.txt
   ```
   > 如果使用 `conda run`，确保目标环境已激活或在命令中指定 `-n <env_name>`。
4. 若需使用 USB-CAN 相关功能，请按原项目要求安装驱动，并确保 `usbcanlib/ControlCAN.dll` 可被系统加载。

### 输入源配置

`main.py` 中的所有视觉进程都会优先读取环境变量指定的视频源；若未显式配置且摄像头不可用，将自动退回到示例视频 `data/yy_fall.mp4`：

- `VIDEO_SOURCE`：全局默认输入源，优先级最低。
- `FAST3DHP_SOURCE` / `FULLSPEED_SOURCE`：三维姿态与高速缓存流程的专用输入源。
- `PANORAMA_SOURCE`：全景跟踪（YOLO + 云台控制）专用输入源。

在 PowerShell 中临时指定示例视频运行：

```powershell
$env:FAST3DHP_SOURCE = "multi_scene_monitoring/data/yy_fall.mp4"
python multi_scene_monitoring/main.py
```

若设置为数字（如 `"0"`），则会尝试打开对应编号的摄像头。

### 模块启停开关

若当前没有硬件（USB-CAN、全景云台等），可通过如下环境变量控制进程是否启动：

- `ENABLE_FAST3DHP`（默认 `1`）：是否运行姿态估计主流程。
- `ENABLE_PANORAMA`（默认 `0`）：是否运行全景跟踪（需要摄像头/云台）。
- `ENABLE_USBCAN`（默认 `0`）：是否启用 USB-CAN 控制进程，需 `usbcanlib/ControlCAN.dll`。

示例：仅运行姿态估计主流程，并使用示例视频：

```powershell
$env:FAST3DHP_SOURCE = "multi_scene_monitoring/data/yy_fall.mp4"
$env:ENABLE_FAST3DHP = "1"
Remove-Item Env:ENABLE_PANORAMA -ErrorAction SilentlyContinue
Remove-Item Env:ENABLE_USBCAN -ErrorAction SilentlyContinue
python multi_scene_monitoring/main.py
```

### 启动示例

1. （可选）按上述方式设置环境变量，或直接使用默认的样例视频自动回退。
2. 根据需要启用/禁用 `MotorUSBCAN` 进程；若当前没有外设，可仅保留视觉分析部分。
3. 运行：
   ```powershell
   python multi_scene_monitoring/main.py
   ```

   > 程序启动后会默认打开三个窗口：`Injury Analysis`、`ICV 3D Human Pose Estimation`（2D 画面）以及 `Canvas 3D`（三维骨架）。窗口位置已调整至常规分辨率范围内，若需自定义可在 `main.py` 中修改 `cv2.moveWindow` 的坐标。

4. 结束运行时需要手动关闭窗口：
   - 在任意窗口按 `ESC` 或 `q`；
   - 或直接点击窗口右上角的关闭按钮。
   程序会等待所有窗口关闭后再退出，以免误触导致分析中断。

   ### 场景分析开关

   设置环境变量 `SCENE` 可以启用场景化的动作检测逻辑：

   - `SCENE=basketball`：启用投篮姿态检测，基于手臂高度、肘部角度、双手夹角等规则输出“shooting posture”提示。
   - `SCENE=classroom`：启用课堂趴桌检测，依据躯干前倾角、头部高度和前移距离识别“leaning on desk”。

   场景提示会展示在 `Injury Analysis` 窗口中，与关节损伤预警一起输出。可与输入源、模块启停开关组合使用，例如：

   ```powershell
   $env:SCENE = "basketball"
   $env:FAST3DHP_SOURCE = "multi_scene_monitoring/data/yy_fall.mp4"
   $env:ENABLE_FAST3DHP = "1"
   python multi_scene_monitoring/main.py
   ```

   同理，将 `SCENE` 设置为 `classroom` 可切换至课堂趴桌检测。

### 快速检查步骤

1. 设置（或跳过）输入源与模块开关；
2. 运行 `python multi_scene_monitoring/main.py`；
3. 在 `Injury Analysis` 窗口查看关节告警与场景提示，`ICV 3D Human Pose Estimation` 与 `Canvas 3D` 分别展示 2D/3D 骨架；
4. 完成验证后，按 `ESC` 或关闭全部窗口结束进程。

## 场景子目录

- `scenes/basketball/`
  - 说明如何将核心算法应用于篮球动作识别，包含临时数据路径和后续扩展建议。
- `scenes/classroom/`
  - 说明课堂坐姿识别的配置要点、阈值调整建议与待补充的数据。

> 后续获取到真实的篮球或课堂视频后，可将其放入对应场景目录下的 `data/` 子文件夹，并在 `main.py` 或自定义脚本中调整输入源。
