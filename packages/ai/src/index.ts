import type { AiRiskLevel } from "@afterclass/shared";

export type AiActionResult = {
  intent: string;
  riskLevel: AiRiskLevel;
  entities: Record<string, unknown>;
  confidence: number;
  requiresConfirmation: boolean;
};

export interface IntentRecognitionProvider {
  recognize(input: string): Promise<AiActionResult>;
}

export class MockIntentRecognitionProvider implements IntentRecognitionProvider {
  async recognize(input: string): Promise<AiActionResult> {
    return {
      intent: "unknown",
      riskLevel: "low",
      entities: { input },
      confidence: 0,
      requiresConfirmation: true,
    };
  }
}
