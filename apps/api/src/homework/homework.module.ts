import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { HomeworkController } from "./homework.controller";
import { HomeworkService } from "./homework.service";

@Module({
  imports: [AccessModule, NotificationsModule],
  controllers: [HomeworkController],
  providers: [HomeworkService],
})
export class HomeworkModule {}
