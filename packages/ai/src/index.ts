import { z } from "zod";
import type { AiRiskLevel } from "@afterclass/shared";

export const aiIntentSchema = z.enum([
  "parent_leave_request",
  "parent_today_status",
  "parent_homework_query",
  "parent_service_validity",
  "teacher_attendance_quick_entry",
  "principal_business_query",
  "unknown",
]);

export const aiActionResultSchema = z.object({
  intent: aiIntentSchema,
  riskLevel: z.enum(["low", "medium", "high"]),
  entities: z.record(z.unknown()),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
  refusalReason: z.string().optional(),
});

export type AiIntent = z.infer<typeof aiIntentSchema>;
export type AiActionResult = z.infer<typeof aiActionResultSchema>;

export type AiProviderOptions = {
  timeoutMs?: number;
};

export interface IntentRecognitionProvider {
  recognize(input: string, options?: AiProviderOptions): Promise<AiActionResult>;
}

export class MockIntentRecognitionProvider implements IntentRecognitionProvider {
  async recognize(input: string, options: AiProviderOptions = {}): Promise<AiActionResult> {
    return withTimeout(Promise.resolve(recognizeByRules(input)), options.timeoutMs ?? 1500, fallbackResult(input, "timeout"));
  }
}

export function createIntentRecognitionProvider(provider = "mock"): IntentRecognitionProvider {
  if (provider !== "mock") {
    return new MockIntentRecognitionProvider();
  }
  return new MockIntentRecognitionProvider();
}

export function fallbackResult(input: string, reason = "fallback"): AiActionResult {
  return {
    intent: "unknown",
    riskLevel: "low",
    entities: { input, reason },
    confidence: 0,
    requiresConfirmation: true,
  };
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}

function recognizeByRules(input: string): AiActionResult {
  const normalized = input.trim();
  const lowered = normalized.toLowerCase();
  const entities: Record<string, unknown> = { rawText: normalized };

  if (containsAny(normalized, ["删除", "批量修改费用", "导出身份证", "导出敏感"])) {
    return result("unknown", "high", entities, 0.75, true, "高风险操作不直接执行");
  }

  if (containsAny(normalized, ["请假", "病假", "事假"])) {
    return result("parent_leave_request", "medium", entities, 0.86, true);
  }

  if (containsAny(normalized, ["今天状态", "到校", "离校", "考勤"])) {
    return result("parent_today_status", "low", entities, 0.82, false);
  }

  if (containsAny(normalized, ["作业", "批改", "错题"])) {
    return result("parent_homework_query", "low", entities, 0.82, false);
  }

  if (containsAny(normalized, ["服务有效期", "到期", "续费"]) && !containsAny(normalized, ["余额", "欠费"])) {
    return result("parent_service_validity", "low", entities, 0.8, false);
  }

  if (containsAny(normalized, ["签到", "签退", "缺勤", "补录"]) || lowered.includes("check in")) {
    return result("teacher_attendance_quick_entry", "medium", entities, 0.78, true);
  }

  if (containsAny(normalized, ["收入", "毛利", "课费", "经营", "核算"])) {
    return result("principal_business_query", "low", entities, 0.76, false);
  }

  return result("unknown", "low", entities, 0.2, true);
}

function result(
  intent: AiIntent,
  riskLevel: AiRiskLevel,
  entities: Record<string, unknown>,
  confidence: number,
  requiresConfirmation: boolean,
  refusalReason?: string,
): AiActionResult {
  return aiActionResultSchema.parse({
    intent,
    riskLevel,
    entities,
    confidence,
    requiresConfirmation,
    refusalReason,
  });
}

function containsAny(input: string, needles: string[]) {
  return needles.some((needle) => input.includes(needle));
}
