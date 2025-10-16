# 青少年篮球动作矫正前端

基于 React 19 + Vite + TypeScript 打造的多角色篮球训练演示项目，集成 TailwindCSS、shadcn/ui、Zustand 状态管理以及 Recharts 可视化，展示家长 / 教练的完整工作流。内置篮球训练指标、PDF 报告导出与动作分析，且具备在线/离线双数据源策略，方便在无后端环境下体验。

## ✨ 功能概览
- **统一登录与角色跳转**：预置家长、教练两种账号，登录后自动进入角色主页，未登录访问受限页会被重定向。
- **家长视角**：
  - 篮球动作矫正：回放窗口、角度面板、指标条、趋势分析、防摔倒提醒。
  - 成长档案：关键指标、季度趋势、7/30 天训练建议、PDF 一键导出。
- **教练视角**：
  - 训练监测：批量学员列表、角度检查、训练趋势图、报告导出，支持学员切换与指标联动。
  - 球队档案：队员信息维护、月度规范度趋势、远程样例回退。
  - 训练计划与消息：多场次安排、提醒推送、反馈记录。
- **可视化与导出**：使用 Recharts 输出折线/柱状/饼图，通过 html2canvas + jsPDF 导出图文报告。
- **数据策略**：优先尝试 Github 等公开示例数据，断网或跨域失败时自动回退至 mock/ 目录的虚拟数据，确保页面功能完整。

## 🗂️ 技术栈
- React 19 · TypeScript · Vite
- TailwindCSS + tailwind-animate · shadcn/ui
- Zustand · React Router DOM 7
- Recharts · html2canvas · jsPDF
- Lucide 图标 · class-variance-authority

## 🚀 快速开始
```bash
# 安装依赖（可使用 npm / pnpm / yarn，下方以 npm 为例）
npm install

# 启动开发环境
npm run dev

# 生产构建
npm run build

# 本地预览构建产物
npm run preview
```

开发服务器启动后访问 http://localhost:5173，使用以下任一账号体验：
| 角色 | 账号 | 密码 |
| ---- | ---- | ---- |
| 家长 | parent001 | 123456 |
| 教练 | coach001 | 123456 |

> 提示：项目会尝试抓取公开示例数据，若网络不可用或接口 404，将自动使用 src/mock/ 中的离线数据，功能不受影响。

## 📁 目录结构
`
src/
├── components/        # 通用组件、shadcn ui 封装、布局
├── data/              # 远程数据源配置
├── hooks/             # 自定义 Hook（音频提醒、异步请求等）
├── lib/               # 模拟 API & 工具方法
├── mock/              # 姿态、篮球、班级/球队虚拟数据
├── pages/             # 家长 / 教师 / 教练 / 登录页面
├── store/             # Zustand 全局状态（登录信息）
├── types/             # TypeScript 类型定义
└── utils/             # 计算工具 & 格式化函数
`

## 📌 注意事项
- 项目使用 TailwindCSS 深浅色主题，登录页可切换暗色模式。
- PDF 导出会捕获页面区域，若引入真实接口请留意跨域与图片资源可用性。
- 若需接入真实后端，可在 `src/lib/api.ts` 中替换 `fetchRemote*` 系列函数，或直接改写导出的异步方法。

## 🎯 人体关键点演示接入
1. 在 `multi_scene_monitoring` 目录运行导出脚本，将视频解析为前端可读的关键点 JSON：
  ```powershell
  python export_pose_sequence.py data/left_knee.mp4 --output ../front-end/public/poses/left_knee_sequence.json --frame-stride 2
  ```
2. 将相同视频拷贝到 `front-end/public/videos/left_knee.mp4`：
  ```powershell
  Copy-Item data/left_knee.mp4 ../front-end/public/videos/left_knee.mp4
  ```
3. 启动前端后，家长视角的篮球动作页面会自动匹配 `left_knee_sequence.json` 中的 `videoSource` 字段，同步播放视频与骨架叠加。
4. 若需要切换其他视频，只需重新运行导出脚本生成新的 JSON，并更新 `public/videos` 中的视频文件名。

欢迎在此基础上继续扩展，例如接入真实传感器数据、完善动作标注、串联通知推送等。
