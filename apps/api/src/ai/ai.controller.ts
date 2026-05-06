import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { AiService } from "./ai.service";
import { RecognizeIntentDto } from "./dto/recognize-intent.dto";

@UseGuards(JwtAuthGuard)
@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("intent-recognition")
  recognizeIntent(@CurrentUser() user: AuthenticatedUser, @Body() dto: RecognizeIntentDto) {
    return this.aiService.recognizeIntent(user, dto);
  }
}
