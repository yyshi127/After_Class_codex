# 文件存储桶和权限策略

## 1. 存储方式

MVP 试运行默认使用 MinIO 作为对象存储，生产环境由 `docker-compose.prod.yml` 启动 `minio` 服务。

默认配置：

- Bucket：`afterclass`
- 服务内网地址：`http://minio:9000`
- 公网暴露：不直接暴露公网，仅绑定到 `127.0.0.1:9000` 和 `127.0.0.1:9001`
- API 访问：由后端签发短时有效 URL

## 2. 文件类型

允许的业务文件类型：

- `checkin_photo`：学生签到照片。
- `homework_original`：作业原图。
- `homework_reviewed`：老师批改图。
- `homework_ai_marked`：AI 圈错图。
- `practice_sheet`：Word 错题练习单。

图片上传限制：

- 仅允许 `image/jpeg`、`image/png`、`image/webp`。
- 上传时校验文件真实签名，防止伪装 MIME 类型。
- 单张图片最大 8MB。

## 3. 权限规则

- 家长只能访问绑定孩子的图片。
- 老师只能访问授权校区和负责班级的图片。
- 管理员只能访问授权校区范围内的图片。
- 获取图片签名 URL 会写入审计日志。
- 签名 URL 有效期为 300 秒。
- MinIO 管理端不得暴露公网。

## 4. 备份要求

MVP 阶段至少每日备份 MinIO 数据卷或 `/opt/afterclass` 下的存储目录。正式上线建议增加异地备份。
