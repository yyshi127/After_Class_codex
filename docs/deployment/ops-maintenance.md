# Ubuntu 运维维护说明

## 1. 日志保留

生产环境日志目录建议：

- `/opt/afterclass/logs/api`
- `/opt/afterclass/logs/nginx`
- `/opt/afterclass/logs/backup.log`

仓库提供 `ops/logrotate/afterclass` 示例配置。部署后复制到 `/etc/logrotate.d/afterclass`：

```bash
sudo cp /opt/afterclass/app/ops/logrotate/afterclass /etc/logrotate.d/afterclass
sudo logrotate -d /etc/logrotate.d/afterclass
```

默认策略：

- 每日轮转。
- 保留 14 天。
- 压缩历史日志。
- 空日志不轮转。

## 2. 磁盘空间检查

仓库提供 `scripts/check-disk.sh`：

```bash
AFTERCLASS_ROOT=/opt/afterclass DISK_USAGE_THRESHOLD=85 /opt/afterclass/scripts/check-disk.sh
```

建议加入 crontab：

```cron
*/30 * * * * /opt/afterclass/scripts/check-disk.sh >> /opt/afterclass/logs/disk-check.log 2>&1
```

## 3. 异常告警

MVP 可先通过 crontab 日志和人工巡检处理。正式试运行建议接入以下任一渠道：

- 服务器监控平台。
- 企业微信或钉钉机器人。
- 云厂商监控告警。

告警至少覆盖：

- 服务健康检查失败。
- 磁盘使用率超过阈值。
- 数据库备份失败。
- HTTPS 证书续期失败。
