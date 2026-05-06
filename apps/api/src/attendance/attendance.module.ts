import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AttendanceController } from "./attendance.controller";
import { AttendanceService } from "./attendance.service";

@Module({
  imports: [AccessModule, NotificationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
