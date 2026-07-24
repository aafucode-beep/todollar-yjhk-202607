# todollar - 智能待办事项管理器

一个功能实用的待办事项管理工具，支持分类、状态和评论，适配 PC 和移动端。

## 功能特点

- 用户认证（邮箱 + 密码，基于 NextAuth，服务端校验）
- 创建多个待办事项列表
- 支持 4 种待办事项状态（重要、普通、进行中、已完成）
- 待办事项评论功能
- 响应式设计，支持 PC 和移动端
- 数据存储在**本地 SQLite**，可完全自托管在自己的 VPS 上

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- SQLite + Prisma（本地数据库，无需外部服务）
- NextAuth.js（认证，JWT 会话）
- Tailwind CSS（样式）
- 部署：Node + PM2 + Nginx（自托管 VPS）

## 本地开发

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写：

```
DATABASE_URL="file:./prod.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="用 openssl rand -base64 32 生成"
```

### 2. 安装依赖并初始化数据库

```bash
npm install
npm run db:push
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 ，先注册账号再登录使用。

## 部署到自己的 VPS

详见 [DEPLOY.md](./DEPLOY.md)，包含上传到新 GitHub 账号、PM2 守护、Nginx 反代与 HTTPS、备份等完整步骤。

## 数据模型

数据存储在 SQLite（`prisma/schema.prisma` 定义），主要表：

1. `User` —— 用户（email、passwordHash）
2. `Column` —— 待办列表（title、order，归属某个 user）
3. `Todo` —— 待办事项（content、comment、status、order，归属某个 column）

## 安全说明

- 认证由 NextAuth 统一处理，会话为签名后的 JWT，服务端接口通过 `getServerSession` 校验身份，用户只能访问自己的数据。
- 密码使用 bcrypt 哈希存储。
- 请务必设置强随机的 `NEXTAUTH_SECRET`，并在生产环境使用 HTTPS。
