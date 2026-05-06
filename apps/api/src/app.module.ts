import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AccessModule } from "./access/access.module";
import { StudentsModule } from "./students/students.module";
import { ClassesModule } from "./classes/classes.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { HomeworkModule } from "./homework/homework.module";
import { FilesModule } from "./files/files.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { FinanceModule } from "./finance/finance.module";
import { LeaveModule } from "./leave/leave.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    AccessModule,
    StudentsModule,
    ClassesModule,
    AttendanceModule,
    HomeworkModule,
    FilesModule,
    NotificationsModule,
    FinanceModule,
    LeaveModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
