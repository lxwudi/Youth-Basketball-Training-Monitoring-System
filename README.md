# 青少年篮球训练视频分析系统

## 项目概览

本项目提供一套“上传训练视频 → 后端多模型分析 → 前端可视化呈现”的端到端解决方案，聚焦运球、投篮、防守三类篮球动作的姿态评估。系统采用 3D 姿态估计、YOLOv8 目标检测与深度学习指标计算，为教练、家长提供可视化训练报告、AI 评语及学员管理功能。

### 最新亮点
- **DeepSeek AI 智能点评**：可选接入大模型 API，生成训练总结、改进建议及评分；若未配置密钥则回退至内置示例数据。
- **学员/家长双端联动**：后端内置学员、家长数据库示例，可生成报告并推送至家长端列表。
- **多场景指标集**：针对运球、防守、投篮三类动作，提供差异化的角度、频率、平衡性等指标。
- **自动转码与播放器兼容性保证**：处理完成后自动调用 FFmpeg 转为 H.264 Baseline (`yuv420p + faststart`)。

详细的新增功能说明参见 `NEW_FEATURES_GUIDE.md`，DeepSeek 相关配置参见 `DEEPSEEK_API_SETUP.md`。

## 系统流程

1. 前端 `front-end` 通过 React + Vite 构建上传界面与实时指标展示面板。
2. 后端 `multi_scene_monitoring/api_server.py` 接收视频、创建处理任务并反馈任务进度。
3. 处理管线依次执行：
   - YOLOv8 (`yolov8n.pt`) 完成目标检测与人体跟踪（参见 `main.py:YoloGetMotorTrack`）。
   - 3D 姿态网络 (`human-pose-estimation-3d.pth`) 输出 19 个关键点坐标。
   - `scenes/basketball/metrics_calculator.py` 根据训练类型生成多维指标。
   - `modules/draw.py` 绘制骨架覆盖画面并写入输出视频。
4. 完成后写入 `outputs/{task_id}_output.mp4` 与 `{task_id}_metrics.json`，并通过 REST API 下发指标、视频与状态。
5. 前端轮询状态、加载指标与视频，实现回放、图表、AI 建议、报告管理等交互。

## 核心功能模块

- 运球分析：运球频率、重心起伏、上下肢关节角度、AI 节奏点评。
- 防守分析：手臂/双腿张开度、膝盖角度、身体平衡、耐力建议。
- 投篮分析：肘腕配合、出手高度、身体垂直度、协调性评分。
- 学员与家长端：学员列表、历史报告、PDF 报告导出（前端实现）、发送记录。
- 数据可视化：多图表联动、骨架叠加视频回放、指标时间线。

## 技术栈

- **后端服务**：Python 3.8+、Flask、Flask-CORS、Werkzeug、NumPy、OpenCV、PyTorch。
- **检测与姿态估计**：Ultralytics YOLOv8（`ultralytics` 包）、3D human pose 模型 (`human-pose-estimation-3d.pth`)、自定义 `InferenceEnginePyTorch`，可选 OpenVINO 推理（`modules/inference_engine_openvino.py`）。
- **视频处理**：FFmpeg（命令行调用）、OpenCV VideoWriter。
- **前端**：React 19、TypeScript、Vite、TailwindCSS、shadcn/ui、Zustand、React Router 7、Recharts、html2canvas、jsPDF。
- **AI/扩展**：DeepSeek API（可选）、测试脚本 `test_*.py` 覆盖 API、逻辑、FFmpeg 与 DeepSeek Mock。

## 模型与资源清单

将以下文件放置于 `multi_scene_monitoring` 根目录：
- `human-pose-estimation-3d.pth`：3D 姿态估计主模型。
- `yolov8n.pt`：YOLOv8 nano 版本模型，用于检测/跟踪球员目标。
- `data/extrinsics.json`：摄像机外参，用于坐标对齐。
- （可选）其它 YOLO/姿态模型，可在 `main.py` 或配置脚本中替换。

## 环境准备

1. 安装 [Python 3.8+](https://www.python.org/downloads/)。
2. 安装 [Node.js 18+](https://nodejs.org/)。
3. 安装 [FFmpeg](https://www.gyan.dev/ffmpeg/builds/)，并将 `ffmpeg.exe` 添加到系统 `PATH`。
4. 若需 GPU 加速，请安装 CUDA 兼容版本的 PyTorch，并确保显卡驱动与 CUDA Toolkit 匹配。

## 快速开始

### 1. 启动后端服务

```powershell
cd multi_scene_monitoring
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements_tiaobei.txt

# (可选) 配置 DeepSeek API Key
$env:DEEPSEEK_API_KEY = "your-api-key"

python api_server.py
```

- API 默认监听 `http://localhost:5000`。
- 上传的原始视频保存于 `uploads/`，处理结果写入 `outputs/`。
- 日志会输出在控制台，若 FFmpeg 转码失败，可在日志中查看详细错误。

### 2. 启动前端应用

```powershell
cd front-end
npm install
npm run dev
```

- 开发服务运行在 `http://localhost:5173`。
- 预置账号：`coach001 / 123456`、`parent001 / 123456`。
- 若后端不可用，前端会自动回退至 `src/mock` 中的本地数据。

### 3. 体验流程

1. 登录教练端 → 训练分析 → 选择运球/投篮/防守。
2. 上传训练视频，等待状态从 `processing` 变为 `completed`。
3. 查看骨架叠加视频、指标曲线、AI 建议，生成或发送报告。

## REST API 概览

```http
POST /api/upload
  - video: multipart 文件
  - training_type: dribbling | defense | shooting (默认 dribbling)

GET /api/status/<task_id>
GET /api/result/<task_id>
GET /api/video/<task_id>
GET /api/raw-video/<task_id>

POST /api/report/send
POST /api/report/save
GET  /api/students
GET  /api/reports/<student_id>
```

- 上传接口会立即返回 `task_id`，前端依据 `status` 轮询进度。
- 指标 JSON 包含每帧的时间戳、指标字典、关键点坐标列表。
- 处理完成后 `video` 接口返回 H.264 Baseline MP4 文件流。

> 更多接口示例与字段说明可参考 `test_api_endpoints.py` 与 `IMPLEMENTATION_SUMMARY.md`。

## 关键脚本与目录

```
multi_scene_monitoring/
├── api_server.py                 # Flask API，负责任务管理、指标落盘、文件服务
├── main.py                       # 传统批处理入口，集成 YOLOv8、姿态估计与多场景模拟
├── export_pose_sequence.py       # 将视频解析为前端可视化所需的关键点 JSON
├── modules/                      # 推理、绘制、滤波等核心模块
├── scenes/basketball/            # 篮球指标计算与动作分析逻辑
├── data/                         # 外参等配置
├── uploads/ | outputs/           # 输入/输出缓存
└── requirements_tiaobei.txt      # 后端依赖列表

front-end/
├── src/components/               # 上传、指标展示、图表等组件
├── src/pages/coach/              # 运球/防守/投篮页面，读取指标并渲染
├── src/lib/api.ts                # 前端 API 封装，含线上/离线双数据源逻辑
├── src/mock/                     # 离线示例数据与骨架序列
└── public/videos | public/poses  # 与后端导出的样例保持同步

根目录
├── test_api_endpoints.py         # 使用 requests 验证后端接口
├── test_deepseek_api.py          # DeepSeek 接入与降级策略测试
├── test_ffmpeg.py                # 检查本地 FFmpeg 可用性
├── test_logic.py                 # 学员报告与 AI 建议逻辑测试
└── IMPLEMENTATION_SUMMARY.md     # 项目的整体改造记录
```

## 前后端协同要点

- **指标扩展**：
  1. 在 `metrics_calculator.py` 编写新的指标计算函数。
  2. 将指标添加到 `calculate_all_metrics` 返回值，并在 `api_server.py` 中按训练类型挑选返回。
  3. 前端对应页面 `METRIC_LABELS` 与图表组件同步更新即可显示新指标。

- **关键点导出给前端演示**：
  ```powershell
  cd multi_scene_monitoring
  python export_pose_sequence.py data/left_knee.mp4 --output ../front-end/public/poses/left_knee_sequence.json --frame-stride 2
  Copy-Item data/left_knee.mp4 ../front-end/public/videos/left_knee.mp4
  ```

- **YOLO 配置**：
  - 默认使用 `yolov8n.pt`，可在 `main.py` 中替换为自定义模型或加速推理选项。
  - 若仅依赖 3D 姿态管线，可按需裁剪 YOLO 相关进程，但需保留模型文件避免加载失败。

## 测试与诊断

- `python test_ffmpeg.py`：确认 FFmpeg 安装与转码参数。
- `python test_api_endpoints.py`：在后端启动后运行，验证上传、状态、结果接口。
- `python test_deepseek_api.py`：检查 DeepSeek API Key 是否生效，或验证 Mock 回退。
- `python test_logic.py`：快速验证学员数据库、报告发送逻辑。

## 常见问题

- **后端无法启动**：检查 Python 版本、虚拟环境、依赖安装及模型文件路径。
- **FFmpeg 报错**：确保 `ffmpeg.exe` 位于 PATH，或在 `transcode_video_to_h264` 中手动指定路径。
- **识别结果漂移**：确认 `data/extrinsics.json` 与拍摄设备一致；需要时重新标定外参。
- **性能不足**：降低视频分辨率、启用 GPU、调整 `export_pose_sequence.py` 的 `frame-stride` 以跳帧处理。
- **前端接口 404**：确认反向代理/CORS 配置；开发环境默认请求 `http://localhost:5000/api`。

## 许可证

MIT License

## 反馈与交流

如在部署、二次开发过程中遇到问题，欢迎提交 Issue 或通过项目维护者渠道联系。欢迎贡献 PR，丰富新的训练场景与指标。 
