# 篮球训练视频分析系统

## 项目概述

本系统是一个基于3D姿态识别的篮球训练视频分析平台，支持运球、投篮、防守三种训练模式的自动分析。上传后的训练视频将由后端自动识别、绘制骨架、计算多维指标，并通过前端进行回放与实时指标展示。

## 主要功能

### 1. 运球训练分析
- 运球频率
- 重心起伏
- 腕、肘、肩、膝关节角度

### 2. 防守训练分析
- 重心起伏
- 胳膊张开程度
- 双腿张开程度
- 膝盖弯曲角度
- 身体平衡性

### 3. 投篮训练分析
- 胳膊弯曲角度（肘关节）
- 手腕角度
- 大臂与身体角度
- 出手点高度
- 身体垂直度
- 双手协调性

## 技术栈

### 后端
- Python 3.x
- Flask (Web API)
- OpenCV (视频处理)
- PyTorch (深度学习)
- FFmpeg (自动转码，保障浏览器兼容)
- 3D人体姿态估计模型

### 前端
- React + TypeScript
- TailwindCSS
- React Router
- Vite

## 安装和运行

### 环境准备

1. 安装 [Python 3.8+](https://www.python.org/downloads/)
2. 安装 [Node.js 18+](https://nodejs.org/)
3. 安装 [FFmpeg](https://www.gyan.dev/ffmpeg/builds/) 并加入环境变量（确保命令行下执行 `ffmpeg -version` 正常）

### 后端设置

1. 进入后端目录:
```bash
cd multi_scene_monitoring
```

2. 安装Python依赖:
```bash
pip install -r requirements_tiaobei.txt
```

3. 确保模型文件存在:
- `human-pose-estimation-3d.pth` (3D姿态估计模型)
- `yolov8n.pt` (YOLO目标检测模型)
- `data/extrinsics.json` (相机外参)

4. 启动Flask API服务器:
```bash
python api_server.py
```

API将在 `http://localhost:5000` 上运行

> 提示：后端会在每次处理完成后自动调用 FFmpeg 将输出视频转码为 H.264 Baseline，并替换 `outputs/{task_id}_output.mp4`，保证浏览器100%可播放。若转码失败，请查看后端控制台日志中的 `FFmpeg 转码失败` 信息。

### 前端设置

1. 进入前端目录:
```bash
cd front-end
```

2. 安装Node.js依赖:
```bash
npm install
```

3. 启动开发服务器:
```bash
npm run dev
```

前端将在 `http://localhost:5173` 上运行

## 使用方法

1. 打开浏览器访问 `http://localhost:5173`
2. 点击"教练"角色登录
3. 进入"训练分析"页面
4. 选择训练类型（运球/投篮/防守）
5. 上传训练视频
6. 等待处理完成
7. 查看自动转码后的骨架视频与实时指标数据（单一播放器展示）

## API接口

### 上传视频
```
POST /api/upload
Content-Type: multipart/form-data

参数:
- video: 视频文件
- training_type: 训练类型 (dribbling/defense/shooting)

返回:
{
  "task_id": "唯一任务ID",
  "message": "视频上传成功，开始处理"
}
```

### 查询处理状态
```
GET /api/status/<task_id>

返回:
{
  "task_id": "任务ID",
  "status": "uploaded|processing|completed|failed",
  "progress": 0-100
}
```

### 获取分析结果
```
GET /api/result/<task_id>

返回:
{
  "task_id": "任务ID",
  "metrics": [
    {
      "frame": 0,
      "timestamp": 0.0,
      "people": [
        {
          "person_id": 0,
          "metrics": {
            "dribble_frequency": 2.3,
            "center_of_mass": 95.2,
            ...
          }
        }
      ]
    }
  ]
}
```

### 获取处理后视频
```
GET /api/video/<task_id>

返回: 视频文件流
```

### 获取原始上传视频（可选）
```
GET /api/raw-video/<task_id>

返回: 原始视频文件流
```

## 项目结构

```
├── front-end/                    # 前端项目
│   ├── src/
│   │   ├── components/          # UI组件
│   │   │   ├── VideoUpload.tsx          # 视频上传组件
│   │   │   ├── LiveMetricsDisplay.tsx   # 视频回放 + 实时指标
│   │   │   └── ui/                      # 基础UI组件
│   │   ├── pages/
│   │   │   ├── CoachTabs.tsx            # 教练主页面
│   │   │   └── coach/                   # 教练子页面
│   │   │       ├── TrainingSelection.tsx  # 训练选择页面
│   │   │       ├── Dribbling.tsx          # 运球分析页面
│   │   │       ├── Defense.tsx            # 防守分析页面
│   │   │       └── Shooting.tsx           # 投篮分析页面
│   │   ├── lib/
│   │   │   └── api.ts              # API接口封装
│   │   └── types/
│   └── package.json
│
└── multi_scene_monitoring/       # 后端项目
  ├── api_server.py            # Flask API服务器（异步处理 + 自动转码）
  ├── main.py                  # 原始姿态识别主程序
    ├── scenes/
    │   └── basketball/
    │       ├── analyzer.py              # 篮球动作分析器
    │       └── metrics_calculator.py    # 指标计算器
    ├── modules/                 # 核心模块
    ├── uploads/                 # 上传视频存储目录
    ├── outputs/                 # 处理结果存储目录
    └── requirements_tiaobei.txt
```

## 注意事项

1. **识别算法保持不变**: 本次改造只修改了前端UI和后端API接口，核心的3D姿态识别算法未做修改
2. **视频格式**: 支持MP4、AVI、MOV、MKV格式
3. **文件大小**: 最大支持500MB的视频文件
4. **自动转码**: 输出视频会通过 FFmpeg 转为 H.264 baseline + `yuv420p` + `faststart`；转码失败时可落回原视频或手动检查日志
5. **处理时间**: 根据视频长度和分辨率，处理时间可能需要几分钟到几十分钟
6. **GPU加速**: 建议使用GPU进行姿态识别，处理速度更快

## 开发说明

### 添加新的指标

如果需要添加新的分析指标，请按以下步骤操作:

1. 在 `multi_scene_monitoring/scenes/basketball/metrics_calculator.py` 中添加计算方法
2. 在对应的前端页面（Dribbling.tsx/Defense.tsx/Shooting.tsx）中更新 `METRIC_LABELS`
3. 确保后端API返回新的指标数据

### 调试模式

后端Flask服务器运行在debug模式，代码修改后会自动重载。
前端Vite开发服务器支持热模块替换(HMR)。

## 故障排除

### 后端无法启动
- 检查Python版本是否为3.8+
- 确保所有依赖包已正确安装
- 检查模型文件是否存在
- 查看控制台错误信息

### 前端无法连接后端
- 确认后端Flask服务器正在运行
- 检查CORS配置是否正确
- 确认API_BASE_URL设置为 `http://localhost:5000/api`

### 视频上传失败
- 检查视频格式是否支持
- 确认文件大小未超过500MB
- 查看浏览器控制台的网络请求错误

### 姿态识别不准确
- 确保视频质量清晰
- 人物应尽量完整出现在画面中
- 避免遮挡和光线过暗
- 若骨架渲染需进一步调整，可修改 `multi_scene_monitoring/modules/draw.py` 中的颜色、线宽或滤镜配置

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。
