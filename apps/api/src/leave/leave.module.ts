import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [LeaveController],
  providers: [LeaveService],
})
export class LeaveModule {}
