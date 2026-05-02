import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FileObjectType, UserRole } from "@prisma/client";
import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { UploadImageDto } from "./dto/upload-image.dto";

const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 8 * 1024 * 1024;

@Injectable()
export class FilesService implements OnModuleInit {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    config: ConfigService,
  ) {
    this.bucket = config.get("S3_BUCKET") ?? "afterclass";
    this.s3 = new S3Client({
      region: config.get("S3_REGION") ?? "local",
      endpoint: config.get("S3_ENDPOINT") ?? "http://localhost:9000",
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.get("S3_ACCESS_KEY") ?? "afterclass_minio",
        secretAccessKey: config.get("S3_SECRET_KEY") ?? "afterclass_minio_password",
      },
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async uploadImage(user: AuthenticatedUser, file: Express.Multer.File | undefined, dto: UploadImageDto) {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Only jpeg, png and webp images are allowed");
    }
    if (file.size > maxImageSize) {
      throw new BadRequestException("Image size must be 8MB or less");
    }
    this.assertImageTypeAllowed(user, dto.type);
    this.accessService.assertCampusAccess(user, dto.campusId);

    let studentId = dto.studentId;
    if (studentId) {
      const student = await this.accessService.findAccessibleStudent(user, studentId);
      if (student.campusId !== dto.campusId) {
        throw new ForbiddenException("Student does not belong to this campus");
      }
      studentId = student.id;
    }

    const extension = this.extensionForMimeType(file.mimetype);
    const objectKey = [
      "uploads",
      dto.campusId,
      dto.type,
      new Date().toISOString().slice(0, 10),
      `${randomUUID()}${extension}`,
    ].join("/");

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const record = await this.prisma.fileObject.create({
      data: {
        campusId: dto.campusId,
        studentId,
        uploadedById: user.id,
        objectKey,
        bucket: this.bucket,
        mimeType: file.mimetype,
        size: file.size,
        type: dto.type,
        businessType: dto.businessType,
        businessId: dto.businessId,
        originalName: file.originalname,
      },
    });

    const signedUrl = await this.signObject(record.objectKey);
    return { ...record, signedUrl };
  }

  async getSignedUrl(user: AuthenticatedUser, id: string) {
    const record = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException("File not found");
    }
    await this.assertFileReadable(user, record);
    return { id: record.id, signedUrl: await this.signObject(record.objectKey), expiresIn: 300 };
  }

  private async assertFileReadable(user: AuthenticatedUser, record: { campusId: string; studentId: string | null }) {
    if (record.studentId) {
      await this.accessService.findAccessibleStudent(user, record.studentId);
      return;
    }
    this.accessService.assertCampusAccess(user, record.campusId);
  }

  private assertImageTypeAllowed(user: AuthenticatedUser, type: FileObjectType) {
    if (
      type !== FileObjectType.checkin_photo &&
      type !== FileObjectType.homework_original &&
      type !== FileObjectType.homework_reviewed &&
      type !== FileObjectType.homework_ai_marked
    ) {
      throw new BadRequestException("This endpoint only accepts image file types");
    }

    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only admin or teacher can upload business images");
    }
  }

  private extensionForMimeType(mimeType: string) {
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/webp") return ".webp";
    return ".jpg";
  }

  private signObject(objectKey: string) {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), { expiresIn: 300 });
  }
}
