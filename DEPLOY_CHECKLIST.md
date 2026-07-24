# 部署清单与注意事项（todollar）

> 本文件记录改造结论、VPS 部署步骤与关键注意事项，配合 [DEPLOY.md](./DEPLOY.md) 使用。

## 一、当前状态结论

- ✅ 代码改造完成：MongoDB Atlas → 本地 **SQLite + Prisma**；认证统一到 **NextAuth**，修复了越权（IDOR）漏洞，清理了敏感日志。
- ✅ 已推送到新账号仓库：`https://github.com/yjhkrepo/todollar`（私有，`master` 分支）。
- ✅ 敏感文件（`.env`、`*.db` 数据库文件）已确认**不会上传**（已在 `.gitignore` 忽略）。
- ⚠️ 尚未在真实 Node 环境执行 `npm run build`，**首次部署时以 VPS 上的构建结果为准**。

## 二、VPS 部署步骤

前提：VPS 已安装 **Node 18+**、**Nginx**，并执行过 `npm i -g pm2`。

```bash
# 1. 拉代码（私有仓库，会要求登录 yjhkrepo）
git clone https://github.com/yjhkrepo/todollar.git
cd todollar

# 2. 配置环境变量
cp .env.example .env
nano .env
#   DATABASE_URL="file:./prod.db"        # 保持默认即可
#   NEXTAUTH_URL="https://你的域名"        # 没域名先填 http://服务器IP:3000
#   NEXTAUTH_SECRET="用 openssl rand -base64 32 生成的随机串"   # 必填!

# 3. 装依赖 + 建库 + 构建
npm install          # 会自动 prisma generate
npm run db:push      # 生成 prisma/prod.db 和表
npm run build

# 4. 启动
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # 按提示再执行一条命令，实现开机自启
```

之后用 Nginx 反向代理到 `127.0.0.1:3000` 并配置 HTTPS（现成配置见 `DEPLOY.md`）。

## 三、关键注意事项

1. **`npm run build` 是关键验证点**：这是唯一还没在真实环境验证过的环节。若构建报错，把错误信息记录下来排查。
2. **`NEXTAUTH_SECRET` 必须设置**，且为强随机值，否则登录会异常。
3. **生产环境务必使用 HTTPS**（NextAuth 在生产模式依赖安全的回调地址）。
4. **`NEXTAUTH_URL` 要与实际访问地址一致**（协议+域名/IP+端口），不一致会导致登录后立刻掉线。
5. **数据库备份很简单**：`prod.db` 是单个文件，定期复制即可：
   ```bash
   cp prisma/prod.db ~/backups/prod-$(date +%F).db
   ```
6. **更新代码后**依次执行：`git pull` → `npm install` → `npm run db:push`（如结构有变）→ `npm run build` → `pm2 restart todollar`。

## 四、Git / 账号相关备忘

- 远程仓库已从旧账号 `SIMPLESEEK/todollar` 切换到 `yjhkrepo/todollar`。
- 本机使用 **Git 凭据管理器 / GitHub CLI（已登录 yjhkrepo）** 进行认证，无需在代码或文档中保存任何 token。
- GitHub 不会在首次 `git push` 时自动创建仓库；换仓库时需先在网页或用 `gh repo create` 建好空仓库。
