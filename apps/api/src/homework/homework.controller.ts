import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CreateHomeworkReviewDto } from "./dto/create-homework-review.dto";
import { PublishFeedbackDto } from "./dto/publish-feedback.dto";
import { PublishHomeworkReviewDto } from "./dto/publish-homework-review.dto";
import { HomeworkService } from "./homework.service";
import { UpdateMistakeStatusDto } from "./dto/update-mistake-status.dto";
import { GenerateSimilarQuestionsDto } from "./dto/generate-similar-questions.dto";
import { UpdateSimilarQuestionStatusDto } from "./dto/update-similar-question-status.dto";
import { GeneratePracticeSheetDto } from "./dto/generate-practice-sheet.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  @Get("homework/reviews")
  listReviews(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.homeworkService.listReviews(user, campusId, studentId);
  }

  @Post("homework/reviews")
  createReview(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateHomeworkReviewDto) {
    return this.homeworkService.createReview(user, dto);
  }

  @Post("homework/reviews/:id/publish")
  publishReview(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: PublishHomeworkReviewDto) {
    return this.homeworkService.publishReview(user, id, dto);
  }

  @Get("feedback")
  listFeedback(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.homeworkService.listFeedback(user, campusId, studentId);
  }

  @Post("feedback")
  publishFeedback(@CurrentUser() user: AuthenticatedUser, @Body() dto: PublishFeedbackDto) {
    return this.homeworkService.publishFeedback(user, dto);
  }

  @Get("mistakes")
  listMistakes(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.homeworkService.listMistakes(user, campusId, studentId);
  }

  @Patch("mistakes/:id/status")
  updateMistakeStatus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateMistakeStatusDto) {
    return this.homeworkService.updateMistakeStatus(user, id, dto);
  }

  @Post("mistakes/:id/similar-questions")
  generateSimilarQuestions(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: GenerateSimilarQuestionsDto) {
    return this.homeworkService.generateSimilarQuestions(user, id, dto);
  }

  @Patch("similar-questions/:id/status")
  updateSimilarQuestionStatus(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateSimilarQuestionStatusDto) {
    return this.homeworkService.updateSimilarQuestionStatus(user, id, dto);
  }

  @Post("practice-sheets")
  generatePracticeSheet(@CurrentUser() user: AuthenticatedUser, @Body() dto: GeneratePracticeSheetDto) {
    return this.homeworkService.generatePracticeSheet(user, dto);
  }

  @Get("practice-sheets")
  listPracticeSheets(@CurrentUser() user: AuthenticatedUser, @Query("campusId") campusId?: string, @Query("studentId") studentId?: string) {
    return this.homeworkService.listPracticeSheets(user, campusId, studentId);
  }

  @Get("practice-sheets/:id/download")
  async downloadPracticeSheet(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() response: Response) {
    const file = await this.homeworkService.getPracticeSheetDownload(user, id);
    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    response.setHeader("Content-Disposition", `attachment; filename=\"${encodeURIComponent(file.filename)}\"`);
    return response.sendFile(file.path);
  }
}
