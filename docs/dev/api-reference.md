# API 接口速查

> 本文档由 `internal/openapi/openapi.yaml`（Huma 自动生成）导出，共 106 个接口。
> 后端代码变更后可用本文末尾的命令重新生成。
>
> - 运行时交互文档：`/api/docs`
> - 原始规范：`/api/openapi.json` · `/api/openapi.yaml`
>
> **鉴权**：标记 🔒 的接口需要登录（`Authorization: Bearer <token>`），部分接口还要求特定 scope；未标记为公开接口。

## 目录

- [Setting](#setting)（27）
- [Copilot](#copilot)（4）
- [Comment](#comment)（14）
- [Connect](#connect)（6）
- [Echo](#echo)（14）
- [Reaction](#reaction)（3）
- [Embedding](#embedding)（3）
- [File](#file)（7）
- [Common](#common)（3）
- [Init](#init)（2）
- [MCP](#mcp)（1）
- [Migration](#migration)（7）
- [Auth](#auth)（5）
- [User](#user)（6）
- [Dashboard](#dashboard)（3）
- [Tag](#tag)（1）

## Setting

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/access-tokens` | 列出访问令牌 |  | 🔒 |
| `POST` | `/access-tokens` | 创建访问令牌 | AccessTokenSettingDto | 🔒 |
| `DELETE` | `/access-tokens/{id}` | 删除访问令牌 |  | 🔒 |
| `GET` | `/agent/info` | 获取 Agent 公开信息 |  | — |
| `GET` | `/agent/settings` | 获取 Agent 设置 |  | 🔒 |
| `PUT` | `/agent/settings` | 更新 Agent 设置 | AgentSettingDto | 🔒 |
| `POST` | `/agent/settings/test` | 测试 Copilot 连接 | AgentSettingDto | 🔒 |
| `GET` | `/embedding/settings` | 获取 Embedding 设置 |  | 🔒 |
| `PUT` | `/embedding/settings` | 更新 Embedding 设置 | EmbeddingSettingDto | 🔒 |
| `GET` | `/oauth2/settings` | 获取 OAuth2 设置 |  | 🔒 |
| `PUT` | `/oauth2/settings` | 更新 OAuth2 设置 | OAuth2SettingDto | 🔒 |
| `GET` | `/oauth2/status` | 获取 OAuth2 状态 |  | — |
| `GET` | `/passkey/settings` | 获取 Passkey 设置 |  | 🔒 |
| `PUT` | `/passkey/settings` | 更新 Passkey 设置 | PasskeySettingDto | 🔒 |
| `GET` | `/passkey/status` | 获取 Passkey 状态 |  | — |
| `GET` | `/s3/settings` | 获取 S3 存储设置 |  | 🔒 |
| `PUT` | `/s3/settings` | 更新 S3 存储设置 | S3SettingDto | 🔒 |
| `POST` | `/s3/settings/test` | 测试 S3 存储连接 | S3SettingDto | 🔒 |
| `GET` | `/settings` | 获取系统全局设置 |  | — |
| `PUT` | `/settings` | 更新系统全局设置 | SystemSettingDto | 🔒 |
| `GET` | `/snapshot/schedule` | 获取定时快照计划 |  | 🔒 |
| `POST` | `/snapshot/schedule` | 设置定时快照计划 | SnapshotScheduleDto | 🔒 |
| `GET` | `/webhook` | 获取所有 Webhook |  | 🔒 |
| `POST` | `/webhook` | 创建 Webhook | WebhookDto | 🔒 |
| `PUT` | `/webhook/{id}` | 更新 Webhook | WebhookDto | 🔒 |
| `DELETE` | `/webhook/{id}` | 删除 Webhook |  | 🔒 |
| `POST` | `/webhook/{id}/test` | 测试 Webhook |  | 🔒 |

## Copilot

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/agent/recent` | 获取作者近况的 AI 总结 |  | — |
| `POST` | `/chat/answer` | 回答 Copilot 正在等待的提问/确认 | AnswerAskInputBody | 🔒 |
| `GET` | `/chat/session` | 获取持久化 Chat 会话 |  | 🔒 |
| `DELETE` | `/chat/session` | 清除持久化 Chat 会话 |  | 🔒 |

## Comment

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/comments` | 按 echo 列出公开评论 |  | — |
| `POST` | `/comments` | 创建公开评论 | CreateCommentDto | — |
| `GET` | `/comments/form` | 获取评论表单元信息 |  | — |
| `POST` | `/comments/integration` | 经访问令牌创建评论（集成） | CreateIntegrationCommentDto | 🔒 |
| `GET` | `/comments/public` | 列出最新公开评论 |  | — |
| `GET` | `/panel/comments` | 管理面板列出评论 |  | 🔒 |
| `POST` | `/panel/comments/batch` | 批量操作评论 | BatchCommentActionDto | 🔒 |
| `GET` | `/panel/comments/settings` | 获取评论系统设置 |  | 🔒 |
| `PUT` | `/panel/comments/settings` | 更新评论系统设置 | ModelSystemSetting | 🔒 |
| `POST` | `/panel/comments/settings/test-email` | 发送评论通知测试邮件 | TestEmailRequest | 🔒 |
| `GET` | `/panel/comments/{id}` | 获取单条评论 |  | 🔒 |
| `DELETE` | `/panel/comments/{id}` | 删除评论 |  | 🔒 |
| `PATCH` | `/panel/comments/{id}/hot` | 置顶/取消置顶评论 | UpdateCommentHotDto | 🔒 |
| `PATCH` | `/panel/comments/{id}/status` | 更新评论审核状态 | UpdateCommentStatusDto | 🔒 |

## Connect

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/connect` | 获取当前实例的连接信息 |  | — |
| `GET` | `/connect/list` | 获取当前实例添加的所有连接 |  | — |
| `POST` | `/connects` | 添加连接 | AddConnectDto | 🔒 |
| `GET` | `/connects/health` | 获取互联健康状态 |  | 🔒 |
| `GET` | `/connects/info` | 获取所有已添加连接的详细信息 |  | — |
| `DELETE` | `/connects/{id}` | 删除连接 |  | 🔒 |

## Echo

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `POST` | `/echo` | 创建新的 Echo | EchoUpsertDto | 🔒 |
| `PUT` | `/echo` | 更新 Echo | EchoUpsertDto | 🔒 |
| `GET` | `/echo/hot` | 获取热门 Echo |  | — |
| `GET` | `/echo/onthisday` | 那年今日 |  | — |
| `GET` | `/echo/page` | 分页获取 Echo（Deprecated） |  | — |
| `POST` | `/echo/page` | 分页获取 Echo（Deprecated） | PageQueryDto | — |
| `POST` | `/echo/query` | 分页/筛选 Echo 列表 | EchoQueryDto | — |
| `GET` | `/echo/random` | 随机返回一篇 Echo |  | — |
| `GET` | `/echo/tag/{tagid}` | 按标签获取 Echo（Deprecated） |  | — |
| `GET` | `/echo/today` | 获取今天的 Echo |  | — |
| `GET` | `/echo/{id}` | 获取指定 ID 的 Echo |  | — |
| `DELETE` | `/echo/{id}` | 删除 Echo |  | 🔒 |
| `POST` | `/tag` | 创建标签 | CreateTagDto | 🔒 |
| `DELETE` | `/tag/{id}` | 删除标签 |  | 🔒 |

## Reaction

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `PUT` | `/echo/{id}/reactions/{emoji}` | 为 Echo 添加表情反应（幂等） |  | — |
| `DELETE` | `/echo/{id}/reactions/{emoji}` | 取消 Echo 的表情反应（幂等） |  | — |
| `GET` | `/reactions` | 获取可用的表情反应 |  | — |

## Embedding

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `POST` | `/embedding/reindex` | 触发全量向量索引重建 |  | 🔒 |
| `POST` | `/embedding/reindex/cancel` | 取消进行中的重建索引作业 |  | 🔒 |
| `GET` | `/embedding/reindex/status` | 查询重建索引作业状态 |  | 🔒 |

## File

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/file/tree` | 获取文件树 |  | 🔒 |
| `GET` | `/file/{id}` | 获取文件元信息 |  | 🔒 |
| `DELETE` | `/file/{id}` | 删除文件 |  | 🔒 |
| `PUT` | `/file/{id}/meta` | 更新对象存储文件元信息 | UpdateFileMetaDto | 🔒 |
| `GET` | `/files` | 分页获取文件列表 |  | 🔒 |
| `POST` | `/files/external` | 登记外链文件 | CreateExternalFileDto | 🔒 |
| `PUT` | `/files/presign` | 获取对象存储直传预签名 URL | GetPresignURLDto | 🔒 |

## Common

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/heatmap` | 获取发布热力图 |  | — |
| `GET` | `/hello` | Hello / 版本信息 |  | — |
| `GET` | `/website/title` | 获取目标网站标题 |  | 🔒 |

## Init

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `POST` | `/init/owner` | 初始化站点 Owner | InitOwnerDto | — |
| `GET` | `/init/status` | 获取系统初始化状态 |  | — |

## MCP

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/mcp/manifest` | 获取 MCP 端点信息与能力清单 |  | 🔒 |

## Migration

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `POST` | `/migration/cancel` | 取消进行中的全局迁移 |  | 🔒 |
| `POST` | `/migration/cleanup` | 清理迁移中间产物 |  | 🔒 |
| `POST` | `/migration/export` | 提交导出作业 | StartExportRequest | 🔒 |
| `POST` | `/migration/export/cancel` | 取消导出作业 |  | 🔒 |
| `GET` | `/migration/export/status` | 查询导出作业状态 |  | 🔒 |
| `POST` | `/migration/start` | 启动全局数据迁移 | StartGlobalMigrationRequest | 🔒 |
| `GET` | `/migration/status` | 查询全局迁移状态 |  | 🔒 |

## Auth

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/oauth/info` | 获取当前用户的 OAuth2 绑定信息 |  | 🔒 |
| `POST` | `/oauth/{provider}/bind` | 绑定 OAuth2 账号到当前用户 | OAuthBindBody | 🔒 |
| `GET` | `/passkeys` | 列出当前用户的 Passkey 设备 |  | 🔒 |
| `PUT` | `/passkeys/{id}` | 更新 Passkey 设备名称 | PasskeyUpdateDeviceNameReq | 🔒 |
| `DELETE` | `/passkeys/{id}` | 删除 Passkey 设备 |  | 🔒 |

## User

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `POST` | `/register` | 用户注册 | RegisterDto | — |
| `GET` | `/user` | 获取当前用户信息 |  | 🔒 |
| `PUT` | `/user` | 更新当前用户信息 | UserInfoDto | 🔒 |
| `PUT` | `/user/admin/{id}` | 切换用户管理员权限 |  | 🔒 |
| `DELETE` | `/user/{id}` | 删除用户 |  | 🔒 |
| `GET` | `/users` | 获取所有用户 |  | 🔒 |

## Dashboard

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/system/check-update` | 检查 Ech0 版本更新 |  | 🔒 |
| `GET` | `/system/logs` | 获取系统历史日志 |  | 🔒 |
| `GET` | `/system/visitor-stats` | 获取近七天访客统计 |  | 🔒 |

## Tag

| 方法 | 路径 | 说明 | 请求体 | 鉴权 |
| --- | --- | --- | --- | --- |
| `GET` | `/tags` | 获取所有标签 |  | — |

## 附：重新生成本文档

```bash
just openapi      # 重新生成 internal/openapi/openapi.yaml
# 然后从该 spec 重新导出本文档（脚本见仓库历史 / 手工维护）
```
