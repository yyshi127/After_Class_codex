import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AiRiskLevel, FeedbackStatus, HomeworkImageType, HomeworkStatus, MistakeStatus, PracticeSheetStatus, SimilarQuestionStatus, UserRole } from "@prisma/client";
import { existsSync, mkdirSync } from "node:fs";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { Document, Packer, PageBreak, Paragraph, TextRun } from "docx";
import { AccessService } from "../access/access.service";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { CreateHomeworkReviewDto } from "./dto/create-homework-review.dto";
import { PublishFeedbackDto } from "./dto/publish-feedback.dto";
import { PublishHomeworkReviewDto } from "./dto/publish-homework-review.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { UpdateMistakeStatusDto } from "./dto/update-mistake-status.dto";
import { GenerateSimilarQuestionsDto } from "./dto/generate-similar-questions.dto";
import { UpdateSimilarQuestionStatusDto } from "./dto/update-similar-question-status.dto";
import { GeneratePracticeSheetDto } from "./dto/generate-practice-sheet.dto";
import { GenerateFeedbackDraftDto } from "./dto/generate-feedback-draft.dto";

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

    const publishedAt = new Date();
    const feedback = await this.prisma.$transaction(async (tx) => {
      const created = await tx.feedback.create({
        data: {
          campusId: student.campusId,
          studentId: student.id,
          teacherId: user.id,
          behavior: dto.behavior,
          homework: dto.homework,
          knowledge: dto.knowledge,
          status: FeedbackStatus.published,
          publishedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          campusId: student.campusId,
          actorUserId: user.id,
          action: "feedback.publish",
          targetType: "feedback",
          targetId: created.id,
          metadata: {
            studentId: student.id,
            teacherId: user.id,
            publishedAt: publishedAt.toISOString(),
          },
        },
      });

      return created;
    });

    await this.notificationsService.createForStudentGuardians({
      studentId: student.id,
      title: "今日点评已发布",
      content: "老师已发布行为表现、作业完成、知识掌握三类今日点评。",
    });

    return feedback;
  }

  async generateFeedbackDraft(user: AuthenticatedUser, dto: GenerateFeedbackDraftDto) {
    this.assertTeacherLike(user);
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    const [latestAttendance, review] = await Promise.all([
      this.prisma.attendanceRecord.findFirst({
        where: { studentId: student.id },
        orderBy: { occurredAt: "desc" },
      }),
      dto.reviewId
        ? this.prisma.homeworkReview.findFirst({
            where: {
              id: dto.reviewId,
              student: this.accessService.buildStudentScopeWhere(user, { studentId: student.id }),
            },
          })
        : this.prisma.homeworkReview.findFirst({
            where: { studentId: student.id },
            orderBy: { createdAt: "desc" },
          }),
    ]);

    const attendanceText =
      latestAttendance?.status === "checked_in" ? "今日已按时到托" : latestAttendance?.status === "leave" ? "今日有请假记录" : "今日考勤待老师确认";
    const homeworkText =
      review?.status === HomeworkStatus.completed ? "作业已完成批改并反馈" : review?.status === HomeworkStatus.needs_correction ? "作业需要订正" : "作业批改待确认";
    const teacherNote = dto.teacherNote?.trim();
    const draft = {
      behavior: teacherNote ? `课堂状态稳定，${teacherNote}` : `课堂状态稳定，${attendanceText}，能跟随晚辅流程完成学习任务。`,
      homework: `${homeworkText}，书写和订正情况建议老师发布前再核对一次。`,
      knowledge: review?.subject ? `${review.subject}相关知识点掌握情况整体正常，错题部分建议结合错题本继续巩固。` : "知识掌握情况整体正常，薄弱点建议结合错题本继续巩固。",
    };

    const log = await this.prisma.aiActionLog.create({
      data: {
        campusId: student.campusId,
        actorUserId: user.id,
        rawInput: teacherNote || `generate feedback draft for ${student.name}`,
        intent: "teacher_feedback_draft",
        entities: {
          studentId: student.id,
          reviewId: review?.id ?? null,
          attendanceStatus: latestAttendance?.status ?? null,
          draft,
        },
        riskLevel: AiRiskLevel.low,
        confidence: 0.78,
        requiresConfirmation: true,
        result: "draft_generated",
      },
    });

    return {
      ...draft,
      logId: log.id,
      requiresConfirmation: true,
    };
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

  async updateSimilarQuestionStatus(user: AuthenticatedUser, id: string, dto: UpdateSimilarQuestionStatusDto) {
    this.assertTeacherLike(user);
    const question = await this.prisma.mistakeSimilarQuestion.findFirst({
      where: {
        id,
        student: this.accessService.buildStudentScopeWhere(user),
      },
    });
    if (!question) {
      throw new NotFoundException("Similar question not found");
    }

    return this.prisma.mistakeSimilarQuestion.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async generatePracticeSheet(user: AuthenticatedUser, dto: GeneratePracticeSheetDto) {
    this.assertTeacherLike(user);
    const student = await this.accessService.findAccessibleStudent(user, dto.studentId);
    const selectedQuestions = await this.prisma.mistakeSimilarQuestion.findMany({
      where: {
        id: { in: dto.similarQuestionIds },
        studentId: student.id,
        status: SimilarQuestionStatus.selected,
      },
      include: {
        mistakeItem: { select: { subject: true, knowledgePoint: true } },
      },
    });

    if (selectedQuestions.length === 0) {
      throw new NotFoundException("No selected similar questions found");
    }

    const title = dto.title ?? `${student.name} 错题练习单`;
    try {
      const filePath = await this.writePracticeSheetDocx(student.id, title, selectedQuestions);

      return this.prisma.practiceSheet.create({
        data: {
          campusId: student.campusId,
          studentId: student.id,
          teacherId: user.id,
          title,
          fileUrl: `local://${filePath}`,
          status: PracticeSheetStatus.ready,
        },
      });
    } catch (error) {
      return this.prisma.practiceSheet.create({
        data: {
          campusId: student.campusId,
          studentId: student.id,
          teacherId: user.id,
          title,
          status: PracticeSheetStatus.failed,
          errorReason: error instanceof Error ? error.message.slice(0, 500) : "练习单生成失败",
        },
      });
    }
  }

  listPracticeSheets(user: AuthenticatedUser, campusId?: string, studentId?: string) {
    this.assertTeacherLike(user);
    return this.prisma.practiceSheet.findMany({
      where: {
        student: this.accessService.buildStudentScopeWhere(user, { campusId, studentId }),
      },
      include: {
        student: { select: { id: true, name: true, class: { select: { id: true, name: true } } } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getPracticeSheetDownload(user: AuthenticatedUser, id: string) {
    this.assertTeacherLike(user);
    const sheet = await this.prisma.practiceSheet.findFirst({
      where: {
        id,
        student: this.accessService.buildStudentScopeWhere(user),
      },
      include: { student: { select: { name: true } } },
    });
    if (!sheet || !sheet.fileUrl?.startsWith("local://")) {
      throw new NotFoundException("Practice sheet not found");
    }

    const path = sheet.fileUrl.slice("local://".length);
    await access(path);
    return {
      path,
      filename: `${sheet.title ?? `${sheet.student.name}错题练习单`}.docx`,
    };
  }

  private async writePracticeSheetDocx(
    studentId: string,
    title: string,
    questions: Array<{
      question: string;
      answer: string | null;
      explanation: string | null;
      mistakeItem: { subject: string | null; knowledgePoint: string | null };
    }>,
  ) {
    const dir = join(process.cwd(), "..", "..", "storage", "practice-sheets", studentId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const path = join(dir, `${Date.now()}.docx`);

    const questionSection = [
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 32 })],
        spacing: { after: 300 },
      }),
      ...questions.flatMap((item, index) => [
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${item.question}`, bold: true })],
          spacing: { after: 160 },
        }),
        new Paragraph(`科目：${item.mistakeItem.subject ?? "未填"}    知识点：${item.mistakeItem.knowledgePoint ?? "待确认"}`),
        new Paragraph({ text: "答题区：", spacing: { after: 260 } }),
        new Paragraph(""),
        new Paragraph(""),
      ]),
    ];

    const answerSection = [
      new Paragraph({
        children: [new PageBreak(), new TextRun({ text: "答案与解析", bold: true, size: 28 })],
        spacing: { after: 300 },
      }),
      ...questions.flatMap((item, index) => [
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${item.question}`, bold: true })],
          spacing: { after: 120 },
        }),
        new Paragraph(`答案：${item.answer ?? "待老师补充"}`),
        new Paragraph({ text: `解析：${item.explanation ?? "待老师补充"}`, spacing: { after: 260 } }),
      ]),
    ];

    const doc = new Document({ sections: [{ children: [...questionSection, ...answerSection] }] });
    const buffer = await Packer.toBuffer(doc);
    await import("node:fs/promises").then((fs) => fs.writeFile(path, buffer));
    return path;
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
