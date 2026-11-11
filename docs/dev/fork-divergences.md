# Fork 与上游的分叉清单（合并前必读）

> 本仓库是 `lin-snow/Ech0` 的二次 fork，跟踪上游 `LiuShen-Fork/Ech0`（清羽飞扬）。
> 每次合并上游前先读这份清单：**表中每一项都是有意为之的分叉**，上游更新了相关文件时，
> 不要盲目取上游——按"合并动作"列处理。
>
> 决策原则（2026-11-08 合并 v5.9.7 时确立）：**upstream-first**，仅保留下表所列的分叉。
> 上次合并提交：`8719d0cd`。

## 1. 品牌 / 标识（上游每次改品牌物料都会冲突）

| 内容 | 文件 | 合并动作 |
| --- | --- | --- |
| 圆角品牌图标（12 个二进制） | `web/public/*.png` `favicon.ico` | **保留 fork 版**（`git checkout --ours`） |
| PWA 名称与描述"克喵のEch0" | `web/public/app.webmanifest` | 取上游结构，把"提笔摘星/清羽飞扬"替换为"克喵のEch0/克喵Moretti" |
| SEO/OG/JSON-LD 品牌词 + repo 地址 | `web/index.html` | 同上；`sameAs` 指向 `github.com/kmoretti/Ech0` |
| README / SECURITY / CONTRIBUTING | 根目录 | 上次合并已统一取上游（现为"提笔摘星"文案）。**如需改回克喵品牌，重写时保留上游新增章节** |

## 2. markdown 图片增强（上游重构渲染器时必须重新插入）

- 文件：`web/src/editor/core/markdown.ts`
- 分叉内容：`markdown.renderer.rules.image` 覆写——本地图片懒加载（`loading=lazy` + `decoding=async` + `.markdown-image` 类），`http(s)` 图片包一层 `.markdown-image-link` 新窗口链接。
- 位置：插在 `link_open` 规则之后、`export type MarkdownLabels` 之前。
- ⚠️ 上游 v5.9.7 重构过该文件（新增 `MarkdownLabels`/`renderMarkdownSync` 等），该覆写是合并时**手工重新插入**的。
- **合并动作**：上游改动 `markdown.ts` 时，取上游版本后检查覆写块是否还在；若上游也改了 image 渲染，对照两者意图融合，跑 `tests/editor/markdown.renderer.test.ts` 验证。

## 3. 编辑 / 删除入口（上游 note wall 没有的功能）

上游把首页换成 note wall 后编辑入口缺失，本 fork 补齐（2026-11-11）：

| 内容 | 文件 |
| --- | --- |
| 墙卡片"…"菜单（编辑/删除，登录可见） | `web/src/components/advanced/wall/TheWallNote.vue`（菜单 + `handleUpdateEcho`/`handleDeleteEcho`，`canManage = interactive && isLogin`） |
| 删除后刷新墙 | `TheNoteWall.vue` 转发 `refresh` 事件 → `HomePage.vue` `@refresh="refreshWall"` → `echoStore.refreshEchos(16)` |
| 详情页编辑按钮 | `web/src/components/advanced/echo/cards/TheEchoDetail.vue`（返回按钮旁，登录可见，`handleEdit`） |
| 编辑交互约定 | 已处编辑模式再点编辑 → toast 提示并跳 `tab=publish`（上游原版只提示不跳转） |

- **合并动作**：上游重构上述任一文件（尤其 TheWallNote/卡片结构）时，保留菜单块与事件链；上游若自己也加了编辑入口，比较后择优。
- 测试：`web/tests/components/wall/TheWallNote.menu.test.ts`（7 用例）。

## 4. 深色模式「夜读书房」调色板（上游没有，墙面此前只有浅色）

- 调色板单一来源：**`web/src/themes/wall.scss`**（`--wall-*` 变量，`:root` 浅色 / `:root.dark` 暗色），经 `themes/index.scss` 引入。
- 组件不再硬编码颜色，全部消费 `rgb(var(--wall-ink-rgb) / x%)` 这类变量：TheWallShell / TheWallNote / TheNoteWall / TheWallRail / TheWallCalendar / TheWallFooter / TheEchoLightbox / HomePage(`wall-tab__sheet` 含 `--md-editor-*`) / EchoPage。
- `web/index.html` 启动 splash 有 `html.dark #app-loader` 暗色块（防冷启动白闪）。
- 暗色基调与上游 dark token 同源：`#191715` 桌面 / `#262019` 纸卡 / `#e9e4dc` 墨 / `#a85c49`→提亮陶土。
- **合并动作**：上游改动墙面组件样式时——
  1. 取上游版本后，把新增的硬编码颜色**翻译成 `--wall-*` 变量**（对照 wall.scss 现有成员，缺则在 wall.scss 补明暗两套值）；
  2. 上游若改了纸卡/日历的底色渐变，对照更新 wall.scss 里对应 `--wall-paper-*` 的**明暗两组**值；
  3. 验证：dev 起服切三主题目检 + `stylelint` + `vitest`。

## 5. 滚动性能优化（上游没有）

| 优化 | 位置 | 合并动作 |
| --- | --- | --- |
| 回顶按钮滚动容器缓存（原版每 scroll 帧跑 `querySelector`+`getComputedStyle`） | `web/src/components/advanced/TheFloatingActions.vue`（`resolveContainer` + 路由切换失效） | 上游若重写此文件，重新应用缓存逻辑 |
| `background-attachment: fixed` ×3 → `position: fixed` 独立背景图层 | 全局 `themes/base.scss`（`body::before`）、`TheWallShell.vue`（`.wall-page__paper` span）、`EchoPage.vue`（`::before`） | 上游若改回 fixed 或重写背景栈，把背景色+图搬进 fixed 图层变量（墙用 `var(--wall-backdrop)`） |

## 6. 已按 upstream-first 丢弃的 fork 特性（勿"找回"，留档避免误判）

- 首页瀑布流 + 本地缓存策略（`home-cache.ts` v2 键、connect 缓存刷新）——上游游标分页架构替代
- 摘要生成自有逻辑（`b0d8e675`/`5d911fbb`）——上游加固版替代
- 4 个 fork-only 测试文件（TheEchoCard/TheRecentCard/TheHubEcho/TheEchos.recent）——随行为一起删除
- `.github/hub-health.json` 曾删除，已按上游恢复

## 合并 SOP 速查

1. `git fetch upstream`，注意上游可能 force push（v5.9.7 合并时就发生过）。
2. `git merge-tree --write-tree --name-only main upstream/main` 无损探测冲突。
3. 冲突分类：本清单所列文件按"合并动作"处理，其余默认取上游。
4. 逐项核对第 2/3/4/5 节（尤其是上游新改的墙面组件颜色翻译成 `--wall-*`）。
5. 验证：`vue-tsc` + `stylelint` + `vitest` + `vite build`，dev 起服三主题目检。
