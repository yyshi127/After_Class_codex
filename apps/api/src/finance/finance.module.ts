import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AccessModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
