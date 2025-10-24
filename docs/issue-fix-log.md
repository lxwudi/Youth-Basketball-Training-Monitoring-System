# 问题清单 & 修复记录 (前端)

## 已处理事项
- [x] 修复生产构建失败：为 `Badge` 增加 `outline` 变体并对 `Toast` 组件扩展 `variant` 支持，消除了 `variant` 属性类型不匹配带来的 TS 编译报错。
- [x] 清理未使用形参：在报告生成及教练页签中忽略 `studentId` 回调形参，避免 TS6133 警告并确保生成报告流程保持原逻辑。
- [x] 通过 ESLint：移除 `buttonVariants` 冗余导出、为 `theme-provider` 添加局部禁用注释，并重写 `useAsyncData` 的依赖处理，`npm run lint` 已无错误。

## 待解决问题
- [ ] 文案编码混乱：多个中文字符串显示为 `�`，需要统一为 UTF-8 并抽离到 i18n 文案文件。
- [ ] 体积超标：构建主包 `assets/index-Ch6Xlbwz.js` 压缩后仍达 424KB，远超目标 180KB，需要拆分路由、懒加载和 3D 资源延迟加载策略。
- [ ] UI 框架升级：当前基于 Vite + React Router，需迁移至 Next.js App Router + Tailwind + R3F，以满足项目重构目标。
- [ ] 动效与 3D 场景缺失：暂无 Lenis/GSAP/R3F 等动效与视差实现，需要按规范补齐组件与场景脚本。
- [ ] 安全与性能基线：未配置 CSP、PWA、A11y 自动校验及 Lighthouse 自测，需要在重构阶段加入。

## 建议的下一步
1. 规划 Next.js + App Router 的项目骨架与目录迁移策略。
2. 设计统一的 Design Tokens（颜色、阴影、模糊、动效节奏）。
3. 建立 i18n JSON 结构，并同步修复所有乱码文案。
4. 拆分现有业务逻辑至模块化组件，逐步接入 Framer Motion / GSAP / R3F。
5. 配置 Lighthouse、Playwright 等自动化校验脚本，为后续调优提供基线。
