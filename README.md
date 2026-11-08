# 提笔摘星

基于 Ech0 打造的个人说说与轻量微博程序，主要用于清羽飞扬的个人站点。

本项目基于原项目 [lin-snow/Ech0](https://github.com/lin-snow/Ech0) 二次开发，保留 Go 单文件后端、Vue 前端、SQLite 数据库以及本地存储、S3 兼容对象存储等核心能力，并围绕个人使用习惯重新设计了首页、内容流、后台入口、上传策略和缓存体验。

> 本仓库重点服务个人使用习惯，不追求与上游功能、文档、发布流程完全一致。如需通用版本、完整社区生态或上游文档，请优先参考原项目。

## 定制重点

- **首页重构**：移除原顶部导航与侧栏，主要入口集中到首页第一张站点卡片与右下角浮动菜单。
- **站点信息卡片**：展示站点头像、服务名称、站点标题、站点说明、常用入口、页脚链接与 GitHub 项目地址。
- **统一视觉风格**：优化说说卡片、评论分割线、加载动画、Hub/探索页、发布页、更新页、设置页等残留页面样式。
- **精简卡片内容**：重新设计热力图、Activity、Recent、Connect 等非说说卡片，使其和说说流区分但不突兀。
- **列表加载体验**：加载更多时使用局部 loading，新增内容逐条进入，避免全屏 loading 和旧内容重排。
- **本地缓存策略**：对说说流和部分非关键数据采用本地缓存；过期后先显示旧缓存，后台刷新，下一次访问使用新缓存。
- **S3 上传策略**：启用 S3 后，图片、附件、头像、站点图标等上传统一走 S3，前端不再暴露“本地 / S3”选择。
- **后台入口调整**：标签管理移动到设置后台；删除暂时用不上的禅模式入口。
- **资源与品牌定制**：替换 favicon、站点图标、默认用户中心头像，PWA 名称调整为“提笔摘星”。

## 快速运行

如果使用本仓库推送到 Docker Hub 的镜像，替换下面的 `<dockerhub-username>`：

```bash
docker run -d \
  --name ech0 \
  -p 6277:6277 \
  -v /opt/ech0/data:/app/data \
  -e JWT_SECRET="please-change-me" \
  <dockerhub-username>/ech0:latest
```

启动后访问：

```text
http://服务器 IP:6277
```

首次注册的账号会成为管理员账号。

### Docker Compose

仓库没有绑定特定的 Docker Hub 用户名。使用前请先完成下方的 Docker Hub Actions 配置，或将镜像地址替换为你自己构建的镜像。

```yaml
services:
  ech0:
    image: <dockerhub-username>/ech0:latest
    container_name: ech0
    restart: unless-stopped
    ports:
      - "6277:6277"
    environment:
      JWT_SECRET: please-change-me
    volumes:
      - ./data:/app/data
```

### 数据目录

默认数据目录为 `/app/data`，SQLite 数据库、本地上传文件和运行数据均需要持久化。升级或迁移前请先备份该目录；启用 S3 后，还应按照对象存储服务商的方式备份桶内文件。

## 开发命令

后端在仓库根目录执行：

```bash
go run ./cmd/ech0 serve
```

前端在 `web/` 目录执行：

```bash
pnpm install
pnpm dev
```

常用校验命令：

```bash
go test ./...
pnpm -C web build
```

本项目使用 SQLite CGO，Windows 本地构建需要可用的 C 编译工具链，例如 w64devkit 或 MSYS2 MinGW。推荐的本地开发方式是分别启动后端与前端：

```bash
# 终端一：仓库根目录
go run ./cmd/ech0 serve

# 终端二：web 目录
pnpm dev
```

前端开发服务器默认运行在 `http://localhost:5173`，并将 `/api` 请求代理到 `http://localhost:6277`。

## Docker Hub 自动构建

本仓库只保留 Docker Hub 镜像发布相关的 GitHub Actions。旧的上游 Hub 登记、Cloudflare 部署、Helm Release、GHCR 测试镜像等 workflow 已不适合该个人 fork，已移除。

### 第一次配置

进入 GitHub 仓库：

```text
Settings -> Secrets and variables -> Actions
```

添加：

- `Variables`：`DOCKERHUB_USERNAME`，值为 Docker Hub 用户名或组织名。
- `Secrets`：`DOCKERHUB_TOKEN`，值为 Docker Hub Access Token，不建议使用账号密码。

Docker Hub Access Token 可在 Docker Hub 的账户设置中创建。令牌至少需要对目标仓库拥有读取、写入权限；目标仓库可提前创建，也可按 Docker Hub 当前规则由首次推送创建。

### 触发方式

- 推送到 `main`：构建并推送 `docker.io/<DOCKERHUB_USERNAME>/ech0:main` 和 `docker.io/<DOCKERHUB_USERNAME>/ech0:latest`。
- 推送 `v*` 标签：构建并推送 `docker.io/<DOCKERHUB_USERNAME>/ech0:vX.Y.Z`。
- 手动运行：在 GitHub Actions 页面选择 `Docker Hub`，可指定自定义镜像标签，并选择是否同时推送 `latest`。

### 构建过程

Action 会先构建前端资源，再分别构建 `linux/amd64` 与 `linux/arm64` 后端二进制，最后用 `docker/Dockerfile` 打包并推送多架构镜像。

构建完成后可在服务器执行：

```bash
docker pull <dockerhub-username>/ech0:latest
docker compose up -d
```

## 与上游关系

- 原项目：[lin-snow/Ech0](https://github.com/lin-snow/Ech0)
- 当前 fork：[LiuShen-Fork/Ech0](https://github.com/LiuShen-Fork/Ech0)

感谢原项目提供的架构、功能与开源基础。本仓库主要用于清羽飞扬个人站点的定制化部署。

## 开源许可

本项目继承上游 Ech0 的开源许可，详见 [LICENSE](./LICENSE)。使用、修改、分发时请遵守对应许可证要求。
