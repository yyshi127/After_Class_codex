import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";

@Module({
  imports: [AccessModule, NotificationsModule],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
