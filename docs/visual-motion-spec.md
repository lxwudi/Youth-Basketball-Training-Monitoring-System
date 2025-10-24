# 视觉规范与动效规范

## 1. Design Tokens
| Token | 值 / 说明 |
| --- | --- |
| `--color-bg-base` | `#0A0B10` 星夜碳黑，整站默认背景 |
| `--color-bg-glass` | `rgba(255,255,255,0.08)` 玻璃卡片填充 |
| `--blur-glass` | `18px` backdrop-blur 强度 |
| `--color-cyan` | `#2FD3FF` 电蓝，按钮/关键信息 |
| `--color-purple` | `#835BFF` 极光紫，辅助高光 |
| `--color-pink` | `#FF3BCD` 激光粉，强调动效 |
| `--color-lime` | `#B8FF5E` 青柠绿，成功提示 |
| `--color-orange` | `#FF7A2F` 熔岩橙，警示态 |
| `--gradient-aurora-1` | `linear-gradient(135deg, #2FD3FF 0%, #835BFF 40%, #FF3BCD 100%)` |
| `--gradient-ion-2` | `linear-gradient(135deg, #B8FF5E 0%, #2FD3FF 50%, #835BFF 100%)` |
| `--shadow-neon` | `0 8px 24px rgba(0,0,0,0.35), inset 0 0 60px rgba(47,211,255,0.08)` |
| `--font-cn` | `"HarmonyOS Sans SC", "Alibaba PuHuiTi 2.0", sans-serif` |
| `--font-en` | `"Outfit", "Inter", sans-serif` |
| `--radius-glass` | `24px` 玻璃卡片圆角 |
| `--radius-pill` | `999px` 磁吸按钮外轮廓 |
| `--motion-fast` | `160ms` 微交互（hover） |
| `--motion-medium` | `480ms` 组件入场 |
| `--motion-slow` | `780ms` 页面转场 |

可在 `design/tokens.json` 中落地 JSON 结构，并在 Tailwind `theme.extend` 中映射为 CSS 变量：
```ts
// tailwind.config.ts (Next.js 项目内)
const colors = {
  neon: {
    cyan: 'rgb(var(--color-cyan) / <alpha-value>)',
    purple: 'rgb(var(--color-purple) / <alpha-value>)',
    pink: 'rgb(var(--color-pink) / <alpha-value>)',
    lime: 'rgb(var(--color-lime) / <alpha-value>)',
    orange: 'rgb(var(--color-orange) / <alpha-value>)',
  },
};
```

## 2. 版式与栅格
- 12 列响应式栅格，容器宽度 1200–1440px，左右安全边距 32px（移动端 20px）。
- 内容分层：`BG.Particles` → 半透明玻璃卡 → 霓虹 CTA → 浮动 3D 模块。
- 标题字号：H1 = 64px/0.95，H2 = 40px/1.1，副标题 24px/1.4；字重 700–900，字距 0.2px。
- 正文：18px/1.65，字重 400/500；英文使用 Outfit，中文使用 HarmonyOS Sans SC。

## 3. 动效系统
| 场景 | easing | 时长 | 细节 |
| --- | --- | --- | --- |
| 微交互 | `cubic-bezier(0.22, 1, 0.36, 1)` | 150–220ms | 按钮 hover：scale 1.0→1.04，阴影增量 + drop-shadow |
| 组件入场 | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 420–600ms | Y 轴 12px 抬升，透明度 0→1，带 8% 过冲 |
| 页面转场 | `cubic-bezier(0.76, 0, 0.24, 1)` | 720ms | Aurora 渐变遮罩从左至右擦拭，叠加雾化 |
| 滚动分镜 | Lenis + GSAP ScrollTrigger | 根据段落 16% 进度触发 | 每屏一个故事点，前后动效可逆 |
| CTA 磁吸 | spring `{ stiffness: 240, damping: 18 }` | 鼠标停留内半径 120px | 指针进入 60ms 内磁吸按钮中心，离开时液波回弹 |
| 指标面板滚动数字 | `steps(12)` + 0.8s | 延迟 120ms 级联 | 支持千分位格式化 |

## 4. Hero 3D 场景规范
- 使用 React Three Fiber + Drei + postprocessing。
- 方案：粒子星云中浮现项目 Logo（支持延迟加载）。
  - Camera: `fov=55`, `position={[0, 0, 6]}`, 初始缓动 1.6s。
  - 粒子：10k instanced particles，颜色沿 Aurora-1 渐变；噪声扰动振幅 0.12。
  - 后期：Bloom `intensity=0.7`, ChromaticAberration `offset=0.0008`, DepthOfField 焦点对准 Logo (焦距 0.9)。
  - 交互：指针移动驱动摄像机 yaw ±8°，倾斜 ±6°；prefers-reduced-motion 时停止摄像机跟随。
- 文案动画：三段打字机效果，每段 1.4s；光标闪烁 650ms；完成后 CTA 按钮磁吸。

## 5. 组件库 Blueprint
| 组件 | 说明 |
| --- | --- |
| `BG.Particles` | Canvas 粒子背景，支持噪声参数、性能降级开关 |
| `Card.Glass` | 背景玻璃卡，含 `frosted`, `solid` 变体，利用 `backdrop-filter: blur(var(--blur-glass))` |
| `Button.Neon` | Aurora 描边、激光粉高光，hover 触发外环光晕 `0 0 24px currentColor` |
| `Button.Magnet` | pointer 交互 + 液波 clip-path 动效 |
| `Badge.KPI` | 数字微光 + 数值滚动动画 |
| `Compare.Slider` | Before/After 对比，使用 `framer-motion` 控制遮罩位置 + GLSL 光幕 |
| `Section.Story` | ScrollTrigger 分镜容器，封装 trigger pinning、进出场控制 |
| `Timeline.Curve` | 贝塞尔轨迹动画，里程碑触发粒子爆闪 |
| `Toolbar.Fab` | 悬浮工具条（下载、联系、主题切换），附带进度环 |

## 6. 无障碍 & 性能守则
- 所有互动元素具备 `role`/`aria-label`，焦点环使用 `outline: 2px solid rgba(47,211,255,0.9)`。
- 支持 `prefers-reduced-motion`：禁用滚动联动动画，提供静态渐变背景。
- 字体：通过 Next.js `next/font` 本地化加载，避免 FOUT/FOIT。
- CSP 示例：`default-src 'self'; script-src 'self'; worker-src 'self' blob:; img-src 'self' data: blob: https://images.unsplash.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.deepseek.com;`。
- PWA：使用 Next PWA 插件缓存 `/app/(marketing)` 静态资源 + 字体，3D 资源分离至延迟缓存。

## 7. 迁移路线图（Vite → Next.js App Router）
1. **骨架创建**：`npx create-next-app@latest`（TypeScript + Tailwind + ESLint），引入 `framer-motion`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `@studio-freight/lenis`, `@radix-ui/react-*`, `shadcn/ui`。
2. **目录规划**：
   - `/app`：营销页（app/(marketing)）+ 应用页（app/(dashboard)）。
   - `/components`：域组件（hero, insights, timeline, kpi）。
   - `/content`：`zh-CN.json` / `en-US.json` 文案。
   - `/design`：Figma 链接说明 + tokens。
   - `/hooks`、`/lib`：封装数据与动效工具。
   - `/public/media`：视频、Lottie、glTF。
3. **逻辑迁移**：
   - 将现有 Zustand store、API 封装迁移至 `/app/(dashboard)/layout.tsx` 的 Server Components + Client components 组合。
   - 利用 Next Route Handlers (`app/api/*`) 封装 Mock，方便本地演示。
4. **样式替换**：重写 Tailwind config，接入自定义 CSS 变量；废除旧 `index.css`。
5. **动效落地**：
   - Hero 场景优先完成，并提炼成 `Hero.R3F` 组件。
   - 引入 ScrollTrigger/Lenis，自定义 hook `useSmoothScroll`，在 layout 中注册。
6. **测试基线**：
   - 配置 Playwright 场景（CTA 磁吸、时间轴、对比滑块交互），Storybook 生成快照。
   - 建立 Lighthouse CI (`npm run lhci`) 目标 ≥95。
7. **发布前检查**：打包 gzip < 350KB，3D 资源延迟加载，PWA manifest & Workbox 配置完成。

## 8. 下一步交付
- 同步在 `README` 增补升级指南与运行步骤。
- 准备 `design/tokens.json`、`content/zh-CN.json` 模板。
- 整理需替换的 Lottie/视频资源规格（≤200KB）。
- 拟定 `Hero` 场景 shader 需求（噪声纹理、色差参数）。
