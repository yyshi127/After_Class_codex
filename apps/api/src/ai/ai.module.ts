import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccessModule } from "../access/access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";

@Module({
  imports: [ConfigModule, PrismaModule, AccessModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
