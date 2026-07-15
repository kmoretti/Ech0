# Ech0 Hub

该目录是探索页使用的 Vue 3 前端。它读取静态实例列表，异步获取各 Ech0 实例的公开说说，并合并为统一时间线。

当前个人 fork 已删除上游的 Issue 自动登记、健康检查清理和 Hub 发布 Actions，因此实例列表需要直接编辑 `public/hub.json`。

## 实例配置

```json
{
  "instances": [
    {
      "id": "my-instance",
      "url": "https://memo.example.com"
    }
  ]
}
```

- `id` 使用简短且唯一的标识。
- `url` 填写实例根地址，不要以 `/` 结尾。
- 实例必须允许 Hub 所在域名跨域访问公开 API 和 `/healthz`。

## 聚合流程

1. 读取 `/hub.json` 实例列表。
2. 请求 `{url}/healthz` 获取健康状态与版本。
3. 请求 `{url}/api/echo/query` 获取公开说说。
4. 合并结果并按创建时间倒序展示。

无法访问或健康检查失败的实例不会进入聚合时间线。Connect 状态等非关键数据应异步加载，不阻塞主要内容展示。

## 开发命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

技术栈包括 Vue 3、TypeScript、Vite、vue-router、vite-plugin-pwa、vue-i18n 和 UnoCSS，并复用 `web/` 中的部分主题与内容组件。
