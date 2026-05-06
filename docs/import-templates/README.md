# 晚辅托管系统导入模板

本目录提供 MVP 试运行阶段的基础数据导入模板。导入顺序建议为：

1. `campuses.csv`
2. `classes.csv`
3. `teachers.csv`
4. `students.csv`

字段说明：

- `external_id`：机构内部编号，用于导入时做幂等匹配。
- `campus_external_id`：关联 `campuses.csv` 中的校区编号。
- `class_external_id`：关联 `classes.csv` 中的班级编号。
- `phone`：登录账号或家长联系电话，建议唯一。
- `id_card_no`：学生身份证号，导入后必须加密存储。
- `service_type_code`：固定为 `noon-care`、`afternoon-care`、`homework-only`、`full-evening-care`。
- `billing_cycle`：固定为 `monthly` 或 `semester`。

身份证号属于敏感信息，模板文件只用于线下导入准备，不应长期保存在公开目录或聊天工具中。
