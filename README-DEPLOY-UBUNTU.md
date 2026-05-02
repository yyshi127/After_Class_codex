# 智能晚辅托管系统 Ubuntu 部署手册

本文档用于 MVP 试运行阶段的单台 Ubuntu 服务器部署。默认部署方式为 Ubuntu Server + Docker Compose + Nginx + HTTPS + 定时备份。

## 1. 服务器要求

- 操作系统：Ubuntu Server 22.04 LTS 或 24.04 LTS。
- 推荐配置：4 核 CPU、8GB 内存、100GB SSD 起步。
- 网络要求：公网 IP、已备案或可用域名。
- 开放端口：`80`、`443`、必要 SSH 端口。
- 生产目录：`/opt/afterclass`。

## 2. 基础软件

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg ufw certbot
```

安装 Docker 和 Compose Plugin：

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
docker compose version
```

## 3. 目录结构

```text
/opt/afterclass/
  app/
  .env.production
  docker-compose.prod.yml
  backups/
  logs/
  scripts/
```

## 4. 部署步骤

1. 将项目代码放到 `/opt/afterclass/app`。
2. 复制 `.env.production.example` 为 `/opt/afterclass/.env.production`，填写真实密钥、域名、数据库密码和对象存储密码。
3. 将 `docker-compose.prod.yml` 放到 `/opt/afterclass/docker-compose.prod.yml`。
4. 将 `nginx/conf.d/afterclass.conf.template` 复制为 `nginx/conf.d/afterclass.conf`，替换真实域名。
5. 首次签发 HTTPS 证书：

```bash
sudo certbot certonly --standalone -d your-domain.example.com
sudo mkdir -p /opt/afterclass/nginx/certs
sudo cp -L /etc/letsencrypt/live/your-domain.example.com/fullchain.pem /opt/afterclass/nginx/certs/fullchain.pem
sudo cp -L /etc/letsencrypt/live/your-domain.example.com/privkey.pem /opt/afterclass/nginx/certs/privkey.pem
```

6. 执行数据库迁移和初始化数据。
7. 启动服务：

```bash
cd /opt/afterclass
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

8. 配置证书续期后同步证书到 `/opt/afterclass/nginx/certs`，并重载 Nginx 容器：

```bash
sudo certbot renew --dry-run
docker compose --env-file .env.production -f docker-compose.prod.yml exec nginx nginx -s reload
```

## 5. 防火墙

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

PostgreSQL、Redis、MinIO 管理端默认不得暴露公网。

## 6. 备份

数据库每日备份：

```bash
crontab -e
```

示例：

```cron
0 2 * * * /opt/afterclass/scripts/backup-db.sh >> /opt/afterclass/logs/backup.log 2>&1
```

上线前必须在测试环境执行一次恢复：

```bash
/opt/afterclass/scripts/restore-db.sh /opt/afterclass/backups/postgres/latest.sql.gz
```

## 7. 健康检查

```bash
/opt/afterclass/scripts/healthcheck.sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

脚本部署后需要授予执行权限：

```bash
chmod +x /opt/afterclass/scripts/*.sh
```

必须确认：

- Web 可通过 HTTPS 访问。
- API 健康检查返回正常。
- PostgreSQL、Redis、MinIO 容器健康。
- 上传图片、查看图片、生成 Word 文件流程正常。
- 服务器重启后服务自动恢复。

## 8. 上线验收

- 核心业务流程通过：登录、拍照签到、家长通知、作业图片上传、批改反馈、错题本、班级核算。
- 权限验证通过：家长不能看余额、欠费金额、班级核算和其他孩子图片。
- 备份和恢复验证通过。
- HTTPS 证书自动续期验证通过。
- 防火墙只开放必要端口。
- 日志、数据库、图片和 Word 文件均持久化。
