import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FeedbackStatus, HomeworkImageType, HomeworkStatus, MistakeStatus, UserRole } from "@prisma/client";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHomeworkReviewDto } from "./dto/create-homework-review.dto";
import { PublishFeedbackDto } from "./dto/publish-feedback.dto";
import { PublishHomeworkReviewDto } from "./dto/publish-homework-review.dto";

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
  ) {}

  listReviews(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) this.accessService.assertCampusAccess(user, campusId);

    return this.prisma.homeworkReview.findMany({
      where: { campusId: { in: campusIds }, studentId: studentId || undefined },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async createReview(user: AuthenticatedUser, dto: CreateHomeworkReviewDto) {
    this.assertTeacherLike(user);
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException("Student not found");
    this.accessService.assertCampusAccess(user, student.campusId);

    return this.prisma.homeworkReview.create({
      data: {
        campusId: student.campusId,
        studentId: student.id,
        teacherId: user.id,
        classId: student.classId,
        subject: dto.subject,
        status: HomeworkStatus.pending,
        teacherComment: dto.teacherComment,
        aiSummary: "AI 圈错建议待生成，第一版由老师确认后发布。",
        images: {
          create: {
            type: HomeworkImageType.original,
            url: dto.originalImageUrl,
            sortOrder: 0,
          },
        },
      },
      include: { images: true },
    });
  }

  async publishReview(user: AuthenticatedUser, reviewId: string, dto: PublishHomeworkReviewDto) {
    this.assertTeacherLike(user);
    const review = await this.prisma.homeworkReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("Homework review not found");
    this.accessService.assertCampusAccess(user, review.campusId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.reviewedImageUrl) {
        await tx.homeworkReviewImage.create({
          data: {
            reviewId,
            type: HomeworkImageType.reviewed,
            url: dto.reviewedImageUrl,
            sortOrder: 1,
          },
        });
      }

      await tx.mistakeBookItem.create({
        data: {
          campusId: review.campusId,
          studentId: review.studentId,
          reviewId: review.id,
          subject: review.subject,
          knowledgePoint: "待老师确认",
          question: "AI 识别到疑似错题，等待老师确认。",
          status: MistakeStatus.candidate,
        },
      });

      return tx.homeworkReview.update({
        where: { id: reviewId },
        data: {
          status: HomeworkStatus.completed,
          teacherComment: dto.teacherComment ?? review.teacherComment,
          publishedAt: new Date(),
        },
        include: { images: true, mistakes: true },
      });
    });
  }

  listFeedback(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    const campusIds = campusId ? [campusId] : user.campusIds;
    if (campusId) this.accessService.assertCampusAccess(user, campusId);
    return this.prisma.feedback.findMany({
      where: { campusId: { in: campusIds }, studentId: studentId || undefined },
      include: {
        student: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async publishFeedback(user: AuthenticatedUser, dto: PublishFeedbackDto) {
    this.assertTeacherLike(user);
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new NotFoundException("Student not found");
    this.accessService.assertCampusAccess(user, student.campusId);

    return this.prisma.feedback.create({
      data: {
        campusId: student.campusId,
        studentId: student.id,
        teacherId: user.id,
        behavior: dto.behavior,
        homework: dto.homework,
        knowledge: dto.knowledge,
        status: FeedbackStatus.published,
        publishedAt: new Date(),
      },
    });
  }

  private assertTeacherLike(user: AuthenticatedUser) {
    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only admin or teacher can operate homework feedback");
    }
  }
}
