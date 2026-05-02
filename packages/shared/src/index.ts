export const USER_ROLES = ["admin", "teacher", "guardian", "student"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SERVICE_TYPE_CODES = ["noon-care", "afternoon-care", "homework-only", "full-evening-care"] as const;
export type ServiceTypeCode = (typeof SERVICE_TYPE_CODES)[number];

export const SERVICE_TYPES: Array<{
  code: ServiceTypeCode;
  name: string;
  description: string;
  includesPickup: boolean;
  includesMeal: boolean;
  includesRest: boolean;
  includesHomeworkHelp: boolean;
}> = [
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

export const FEEDBACK_CATEGORIES = ["behavior", "homework", "knowledge"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const BILLING_CYCLES = ["monthly", "semester"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const AI_RISK_LEVELS = ["low", "medium", "high"] as const;
export type AiRiskLevel = (typeof AI_RISK_LEVELS)[number];
