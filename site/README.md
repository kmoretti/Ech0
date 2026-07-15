# 提笔摘星文档站

该目录包含提笔摘星 / Ech0 定制版的静态文档站。项目使用 React Router 7、React 19、Vite、Tailwind CSS v4 和 Markdown 文档，不使用服务端渲染。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `app/routes/` | 首页、文档目录、文档详情和隐私页面 |
| `app/docs/` | 文档注册、Markdown 渲染和目录工具 |
| `docs/` | Markdown 文档及图片资源 |
| `public/` | favicon、截图和静态托管配置 |

文档排序和推荐内容由 `app/docs/registry.ts` 中的 `DOC_ORDER`、`DOC_HERO_SLUGS` 控制。

## 开发命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm lint
pnpm format
```

开发服务器默认运行在 `http://localhost:5173`。构建产物位于 `build/client/`。

## 环境变量

`VITE_SITE_URL` 用于配置站点规范地址、Open Graph、JSON-LD 等链接。部署到自定义域名时，还应同步检查 `public/sitemap.xml` 和 `public/robots.txt`。

## 编辑文档

1. 在 `docs/` 下添加或修改 Markdown 文件。
2. 需要固定侧栏顺序时，在 `app/docs/registry.ts` 中登记 slug。
3. Markdown 中可使用 `![](imgs/...)` 引用图片，构建时会转换为 `/docs-assets/imgs/...`。

该文档站属于 [LiuShen-Fork/Ech0](https://github.com/LiuShen-Fork/Ech0) 仓库，项目来源与开源许可见根目录 `README.md` 和 `LICENSE`。
