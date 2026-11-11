# Ech0 项目长期笔记

## 分叉账本（上游合并必读）
- **`docs/dev/fork-divergences.md` 是 fork 与上游全部有意分叉的唯一清单**，合并上游前必读，合并后更新。
- 决策原则：upstream-first（2026-11-08 v5.9.7 合并确立）。分叉仅限：①品牌物料（图标/PWA/SEO 品牌词=克喵のEch0）②markdown.ts 图片懒加载+点击链接规则（上游重构渲染器后手工重插）③墙卡片/详情页编辑删除入口（上游 note wall 没有）④`themes/wall.scss` 深色模式「夜读书房」调色板（墙面组件禁止硬编码颜色，新增颜色必须翻译成 --wall-* 变量并补明暗两套）⑤滚动优化（FixedActions 容器缓存 + background-attachment:fixed 改 fixed 图层 ×3）。
- 已按 upstream-first 丢弃（勿找回）：瀑布流+本地缓存、摘要自有逻辑、4 个 fork-only 测试。

## 本机环境要点
- 本机无 Go 工具链，后端无法本地编译验证（后端改动依赖上游 CI）。
- corepack/pnpm 直连 npmjs 会失败，用 `--registry=https://registry.npmjs.org` 不行时换 npmmirror。
- vitest 用例数在多次全量运行间有波动（文件数 29→31），全绿即可，非引入回归。
- 视觉验证技巧：vite dev + `/preview` 路由（DEV-only，自带 demo 数据无需后端）+ Chrome headless 截图，主题用临时 seed 页写 localStorage（`"theme"`/`"themeMode"` 为 JSON 字符串）。无头截图便签"幽灵化"是 virtual-time 冻结合成器动画的假象，真浏览器正常。
- shell cwd 每次调用重置，命令必须带 cd。

## 未合入工作区（截至 2026-11-11）
三批改动待提交：编辑/删除入口、滚动性能优化、深色模式适配。均为验证过的状态，详见 `2026-11-08.md` 日志与 `docs/dev/fork-divergences.md`。
