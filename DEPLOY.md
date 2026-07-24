# 部署到自己的 VPS（Node + PM2 + Nginx + 本地 SQLite）

本项目已改为使用**本地 SQLite 数据库**，数据文件直接保存在 VPS 上，无需任何外部数据库服务。

## 一、准备工作（本地）

1. 复制环境变量文件并填写：
   ```bash
   cp .env.example .env
   ```
   - `NEXTAUTH_SECRET`：用 `openssl rand -base64 32` 生成一串随机值填进去。
   - `NEXTAUTH_URL`：部署后填你的域名（如 `https://todo.example.com`）。

2. 首次初始化数据库（会根据 schema 生成表结构）：
   ```bash
   npm install
   npm run db:push
   npm run dev
   ```
   访问 http://localhost:3000 注册账号并测试。

## 二、上传到新的 GitHub 账号

```bash
# 在项目目录下，移除旧的远程仓库
git remote remove origin

# 换成你新账号下新建的空仓库地址
git remote add origin https://github.com/<你的新账号>/<新仓库名>.git

git add .
git commit -m "Refactor: 迁移到 SQLite + NextAuth，支持 VPS 自托管"
git branch -M main
git push -u origin main
```

> ⚠️ `.env` 和 `*.db` 已被 `.gitignore` 忽略，不会上传，请放心。

## 三、VPS 部署步骤

假设 VPS 是 Ubuntu/Debian，已装好 Node.js 18+ 和 Nginx。

```bash
# 1. 安装 PM2（进程守护）
npm install -g pm2

# 2. 拉取代码
git clone https://github.com/<你的新账号>/<新仓库名>.git
cd <新仓库名>

# 3. 配置环境变量（在服务器上新建 .env）
cp .env.example .env
nano .env          # 填入 NEXTAUTH_URL=你的域名、NEXTAUTH_SECRET=随机值

# 4. 安装依赖 + 初始化数据库 + 构建
npm install         # postinstall 会自动执行 prisma generate
npm run db:push     # 生成 prisma/prod.db 及表结构
npm run build

# 5. 用 PM2 启动
pm2 start ecosystem.config.js
pm2 save            # 保存进程列表
pm2 startup         # 按提示执行一条命令，实现开机自启
```

应用会监听 `127.0.0.1:3000`，接下来用 Nginx 反向代理并配 HTTPS。

## 四、Nginx 反向代理

新建 `/etc/nginx/sites-available/todollar`：

```nginx
server {
    listen 80;
    server_name todo.example.com;   # 换成你的域名

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用并重载：

```bash
ln -s /etc/nginx/sites-available/todollar /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

配置 HTTPS（强烈建议，NextAuth 生产环境需要）：

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d todo.example.com
```

拿到证书后，把 `.env` 里的 `NEXTAUTH_URL` 改成 `https://todo.example.com`，然后：

```bash
pm2 restart todollar
```

## 五、更新与备份

- **更新代码**：
  ```bash
  git pull
  npm install
  npm run db:push   # 若数据结构有变动
  npm run build
  pm2 restart todollar
  ```

- **备份数据库**（只需复制一个文件）：
  ```bash
  cp prisma/prod.db ~/backups/prod-$(date +%F).db
  ```

## 常见问题

- **登录后立刻退出 / 报错**：多半是 `NEXTAUTH_SECRET` 未设置或 `NEXTAUTH_URL` 与实际域名不一致。
- **数据没保存**：检查 `prisma/prod.db` 是否存在、进程对该文件是否有写权限。
