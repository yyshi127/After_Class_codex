import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiRiskLevel } from "@prisma/client";
import { createIntentRecognitionProvider } from "@afterclass/ai";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { RecognizeIntentDto } from "./dto/recognize-intent.dto";

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async recognizeIntent(user: AuthenticatedUser, dto: RecognizeIntentDto) {
    const provider = createIntentRecognitionProvider(this.config.get<string>("AI_PROVIDER") ?? "mock");
    const startedAt = Date.now();
    const result = await provider.recognize(dto.input, { timeoutMs: 1500 });
    const campusId = dto.campusId && user.campusIds.includes(dto.campusId) ? dto.campusId : user.campusIds[0] ?? null;
    const promptTokenCount = this.estimateTokenCount(dto.input);
    const completionTokenCount = this.estimateTokenCount(JSON.stringify(result));

    const log = await this.prisma.aiActionLog.create({
      data: {
        campusId,
        actorUserId: user.id,
        rawInput: dto.input,
        intent: result.intent,
        entities: {
          ...result.entities,
          latencyMs: Date.now() - startedAt,
          refusalReason: result.refusalReason,
        },
        riskLevel: result.riskLevel as AiRiskLevel,
        confidence: result.confidence,
        promptTokenCount,
        completionTokenCount,
        totalTokenCount: promptTokenCount + completionTokenCount,
        costCents: 0,
        requiresConfirmation: result.requiresConfirmation,
        result: result.refusalReason ?? "intent_recognized",
      },
    });

    return {
      ...result,
      logId: log.id,
    };
  }

  private estimateTokenCount(text: string) {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}
