import { Module } from "@nestjs/common";
import { AccessModule } from "../access/access.module";
import { ClassesController } from "./classes.controller";
import { ClassesService } from "./classes.service";

@Module({
  imports: [AccessModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
