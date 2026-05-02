export declare const USER_ROLES: readonly ["admin", "teacher", "guardian", "student"];
export type UserRole = (typeof USER_ROLES)[number];
export declare const SERVICE_TYPE_CODES: readonly ["noon-care", "afternoon-care", "homework-only", "full-evening-care"];
export type ServiceTypeCode = (typeof SERVICE_TYPE_CODES)[number];
export declare const SERVICE_TYPES: Array<{
    code: ServiceTypeCode;
    name: string;
    description: string;
    includesPickup: boolean;
    includesMeal: boolean;
    includesRest: boolean;
    includesHomeworkHelp: boolean;
}>;
export declare const FEEDBACK_CATEGORIES: readonly ["behavior", "homework", "knowledge"];
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export declare const BILLING_CYCLES: readonly ["monthly", "semester"];
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export declare const AI_RISK_LEVELS: readonly ["low", "medium", "high"];
export type AiRiskLevel = (typeof AI_RISK_LEVELS)[number];
