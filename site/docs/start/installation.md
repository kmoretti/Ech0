---
title: 安装部署
description: 使用自建 Docker Hub 镜像或源码部署提笔摘星
---

本定制仓库只保留 Docker Hub 镜像构建流程，不提供上游的 Release 二进制、Helm 仓库和自动安装脚本。推荐先通过 GitHub Actions 构建自己的多架构镜像，再使用 Docker 或 Docker Compose 部署。

## 部署前准备

| 项目 | 说明 |
| --- | --- |
| Docker Hub | 创建账号和 Access Token，目标仓库建议命名为 `ech0`。 |
| GitHub Actions | 配置变量 `DOCKERHUB_USERNAME` 和密钥 `DOCKERHUB_TOKEN`。 |
| 数据目录 | 必须映射 `/app/data`，避免重建容器后丢失数据库和本地文件。 |
| `JWT_SECRET` | 使用足够长的随机字符串，不要使用文档示例值。 |
| 端口 | 服务默认监听 `6277`。公网使用时还需配置防火墙、反向代理和 HTTPS。 |

完整的 Docker Hub Actions 使用方式见仓库根目录 [README](https://github.com/LiuShen-Fork/Ech0/blob/main/README.md)。

## Docker

将 `<dockerhub-username>` 替换为你的 Docker Hub 用户名：

```bash
docker run -d \
  --name ech0 \
  --restart unless-stopped \
  -p 6277:6277 \
  -v /opt/ech0/data:/app/data \
  -e JWT_SECRET="请改为随机长字符串" \
  <dockerhub-username>/ech0:latest
```

启动后访问 `http://<服务器 IP>:6277`。第一个注册的账号会成为 Owner。

## Docker Compose

```yaml
services:
  ech0:
    image: <dockerhub-username>/ech0:latest
    container_name: ech0
    restart: unless-stopped
    ports:
      - "6277:6277"
    environment:
      JWT_SECRET: 请改为随机长字符串
    volumes:
      - ./data:/app/data
```

在配置文件所在目录执行：

```bash
docker compose up -d
```

## 源码运行

后端需要 Go `1.26.0+` 和可用于 CGO 的 C 工具链，前端需要 Node.js `25.5.0+` 与 pnpm `10+`。

开发预览时分别启动：

```bash
# 仓库根目录
go run ./cmd/ech0 serve

# web 目录
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:5173`，前端会把 `/api` 请求代理到 `http://localhost:6277`。

生产构建：

```bash
pnpm -C web install --frozen-lockfile
pnpm -C web build
go build -o ech0 ./cmd/ech0
```

生成的 Go 二进制会嵌入 `template/dist/` 中的前端资源。

## 数据与升级

默认数据位于 `/app/data`。升级前先备份该目录；启用 S3 时还需备份对象存储桶。升级 Docker 部署时拉取新镜像并重建容器，不要删除或更换原数据卷。

其他环境变量、存储策略与开发说明以当前仓库的 `README.md` 和 `docs/` 为准。
