import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { UploadImageDto } from "./dto/upload-image.dto";
import { FilesService } from "./files.service";

@UseGuards(JwtAuthGuard)
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadImage(@CurrentUser() user: AuthenticatedUser, @UploadedFile() file: Express.Multer.File, @Body() dto: UploadImageDto) {
    return this.filesService.uploadImage(user, file, dto);
  }

  @Get(":id/signed-url")
  getSignedUrl(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.filesService.getSignedUrl(user, id);
  }
}
