# 参与贡献

提笔摘星是基于 [lin-snow/Ech0](https://github.com/lin-snow/Ech0) 打造的个人定制版本，主要服务清羽飞扬的实际使用需求。通用功能建议也可以优先反馈给上游项目。

## 沟通方式

- 可复现的问题请使用 GitHub Issues。
- 开放性想法和使用问题请使用 GitHub Discussions。
- 安全漏洞请按照 [SECURITY.md](./SECURITY.md) 私密提交，不要创建公开 Issue。

## 开发环境

后端要求 Go `1.26.0+` 和可用于 CGO 的 C 工具链；前端要求 Node.js `25.5.0+` 与 pnpm `10+`。

常用命令：

```bash
make run
make dev
make check
make wire-check
go build ./...
pnpm -C web build
```

前端开发可在 `web/` 目录执行：

```bash
pnpm install
pnpm dev
pnpm lint
```

## 提交流程

1. 从 `main` 创建用途明确的分支，例如 `feat/xxx` 或 `fix/xxx`。
2. 每个 Pull Request 尽量只处理一种问题，避免混入无关重构和格式化。
3. 按修改范围运行测试、构建和格式检查。
4. 在 Pull Request 中说明修改目的、主要变化、验证方式和兼容性影响。

## 必要检查

提交前至少运行：

```bash
make check
make wire-check
go build ./...
pnpm -C web build
```

修改接口路由、请求或响应结构时运行 `make swagger`；修改 Wire 构造器、绑定或 provider set 时运行 `make wire`。前端不得硬编码界面文本，需要使用 vue-i18n，并确保 `pnpm i18n:check` 通过。

## 代码规范

- 遵循现有的 handler → service → repository → database 分层。
- 跨领域导入使用项目既有的 `xxxHandler`、`xxxService`、`xxxRepository`、`xxxModel`、`xxxUtil` 别名。
- `.go`、`.ts`、`.vue` 文件需要保留 SPDX 头。
- 用户可见变化应记录到 `CHANGELOG.md` 的 `[Unreleased]`。
- 不要提交密钥、令牌、个人数据、数据库文件或上传目录。

## 开源许可

提交代码即表示你同意该贡献按照本项目当前的 AGPL-3.0 许可证发布。
