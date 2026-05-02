export const USER_ROLES = ["admin", "teacher", "guardian", "student"];
export const SERVICE_TYPE_CODES = ["noon-care", "afternoon-care", "homework-only", "full-evening-care"];
export const SERVICE_TYPES = [
    {
        code: "noon-care",
        name: "中午托",
        description: "包含接送、午餐和午休。",
        includesPickup: true,
        includesMeal: true,
        includesRest: true,
        includesHomeworkHelp: false,
    },
    {
        code: "afternoon-care",
        name: "下午托",
        description: "包含接放学和就餐。",
        includesPickup: true,
        includesMeal: true,
        includesRest: false,
        includesHomeworkHelp: false,
    },
    {
        code: "homework-only",
        name: "晚辅导",
        description: "不接、不吃，仅辅导作业。",
        includesPickup: false,
        includesMeal: false,
        includesRest: false,
        includesHomeworkHelp: true,
    },
    {
        code: "full-evening-care",
        name: "晚全托",
        description: "包含下午托和晚辅导。",
        includesPickup: true,
        includesMeal: true,
        includesRest: false,
        includesHomeworkHelp: true,
    },
];
export const FEEDBACK_CATEGORIES = ["behavior", "homework", "knowledge"];
export const BILLING_CYCLES = ["monthly", "semester"];
export const AI_RISK_LEVELS = ["low", "medium", "high"];
