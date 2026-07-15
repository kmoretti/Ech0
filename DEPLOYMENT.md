# 部署指南

本定制仓库只维护 Docker Hub 多架构镜像构建流程，不提供上游的 Release 二进制、Helm 发布和自动安装脚本。

## Docker Hub 准备

在仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- Variables：`DOCKERHUB_USERNAME`
- Secrets：`DOCKERHUB_TOKEN`

推送到 `main` 后，GitHub Actions 会构建并推送：

```text
<dockerhub-username>/ech0:main
<dockerhub-username>/ech0:latest
```

推送 `v*` 标签时会额外生成相同版本号的镜像标签。也可以在 Actions 页面手动运行并指定标签。

## Docker 部署

```bash
docker run -d \
  --name ech0 \
  --restart unless-stopped \
  -p 6277:6277 \
  -v /opt/ech0/data:/app/data \
  -e JWT_SECRET="请改为随机长字符串" \
  <dockerhub-username>/ech0:latest
```

启动后访问 `http://<服务器 IP>:6277`。第一个注册账号会成为 Owner。

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

```bash
docker compose up -d
```

## 更新

更新前先备份数据目录和 S3 对象存储桶，然后执行：

```bash
docker compose pull
docker compose up -d --force-recreate
```

使用 `docker run` 时，先拉取新镜像，再使用完全相同的数据卷、`JWT_SECRET` 和其他环境变量重建容器。不要通过删除数据目录解决升级问题。

## 源码开发

```bash
# 仓库根目录启动后端
go run ./cmd/ech0 serve

# web 目录启动前端
pnpm install
pnpm dev
```

前端预览地址为 `http://localhost:5173`，后端默认地址为 `http://localhost:6277`。

更多说明见 [README.md](./README.md) 和 [存储迁移指南](./docs/usage/storage-migration.md)。
