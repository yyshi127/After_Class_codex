import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FeedbackStatus, HomeworkImageType, HomeworkStatus, MistakeStatus, SimilarQuestionStatus, UserRole } from "@prisma/client";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHomeworkReviewDto } from "./dto/create-homework-review.dto";
import { PublishFeedbackDto } from "./dto/publish-feedback.dto";
import { PublishHomeworkReviewDto } from "./dto/publish-homework-review.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { UpdateMistakeStatusDto } from "./dto/update-mistake-status.dto";
import { GenerateSimilarQuestionsDto } from "./dto/generate-similar-questions.dto";

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: AccessService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listReviews(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    return this.prisma.homeworkReview.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
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
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);

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
    const review = await this.prisma.homeworkReview.findFirst({
      where: {
        id: reviewId,
        student: this.accessService.buildStudentScopeWhere(user),
      },
    });
    if (!review) throw new NotFoundException("Homework review not found");

    const updated = await this.prisma.$transaction(async (tx) => {
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

    await this.notificationsService.createForStudentGuardians({
      studentId: review.studentId,
      title: "作业批改已更新",
      content: "老师已发布新的作业批改反馈，可查看作业原图和批改图片。",
    });

    return updated;
  }

  listFeedback(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    return this.prisma.feedback.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
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
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);

    const feedback = await this.prisma.feedback.create({
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

    await this.notificationsService.createForStudentGuardians({
      studentId: student.id,
      title: "今日点评已发布",
      content: "老师已发布行为表现、作业完成、知识掌握三类今日点评。",
    });

    return feedback;
  }

  listMistakes(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    return this.prisma.mistakeBookItem.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        review: { select: { id: true, subject: true, createdAt: true } },
        similarQuestions: { orderBy: { createdAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async updateMistakeStatus(user: AuthenticatedUser, id: string, dto: UpdateMistakeStatusDto) {
    this.assertTeacherLike(user);
    const mistake = await this.findAccessibleMistake(user, id);
    return this.prisma.mistakeBookItem.update({
      where: { id: mistake.id },
      data: {
        status: dto.status,
        knowledgePoint: dto.knowledgePoint ?? mistake.knowledgePoint,
      },
      include: { similarQuestions: true },
    });
  }

  async generateSimilarQuestions(user: AuthenticatedUser, id: string, dto: GenerateSimilarQuestionsDto) {
    this.assertTeacherLike(user);
    const mistake = await this.findAccessibleMistake(user, id);
    const count = dto.count ?? 3;
    const questions = Array.from({ length: count }, (_, index) => ({
      campusId: mistake.campusId,
      studentId: mistake.studentId,
      mistakeItemId: mistake.id,
      question: `同类练习 ${index + 1}：围绕「${mistake.knowledgePoint ?? "待确认知识点"}」设计的巩固题。`,
      answer: "参考答案待老师确认",
      explanation: "该题由 MVP mock 生成，正式版将接入 AI 生成题干、答案和解析。",
      status: SimilarQuestionStatus.candidate,
    }));

    await this.prisma.mistakeSimilarQuestion.createMany({ data: questions });
    return this.prisma.mistakeBookItem.findUnique({
      where: { id: mistake.id },
      include: { similarQuestions: { orderBy: { createdAt: "desc" } } },
    });
  }

  private async findAccessibleMistake(user: AuthenticatedUser, id: string) {
    const mistake = await this.prisma.mistakeBookItem.findFirst({
      where: {
        id,
        student: this.accessService.buildStudentScopeWhere(user),
      },
    });
    if (!mistake) {
      throw new NotFoundException("Mistake item not found");
    }
    return mistake;
  }

  private assertTeacherLike(user: AuthenticatedUser) {
    if (user.role !== UserRole.admin && user.role !== UserRole.teacher) {
      throw new ForbiddenException("Only admin or teacher can operate homework feedback");
    }
  }
}
