import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

@Module({
  imports: [AccessModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
