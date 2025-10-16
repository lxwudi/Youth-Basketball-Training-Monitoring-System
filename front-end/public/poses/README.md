# 姿态关键点数据

此目录用于存放从 `multi_scene_monitoring/export_pose_sequence.py` 导出的姿态序列 JSON。

示例生成命令（在 `multi_scene_monitoring` 目录下执行）：

```powershell
python export_pose_sequence.py data/left_knee.mp4 --output ../front-end/public/poses/left_knee_sequence.json --frame-stride 2
```

请同时将对应的视频拷贝至 `front-end/public/videos/` 目录，例如：

```powershell
Copy-Item data/left_knee.mp4 ../front-end/public/videos/left_knee.mp4
```

前端会根据导出的 `videoSource` 字段自动选择视频文件。