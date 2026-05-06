import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsController } from "./notifications.controller";
import { NotificationChannelService } from "./notification-channel.service";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationChannelService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
