import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../auth/types";
import { CreateHomeworkReviewDto } from "./dto/create-homework-review.dto";
import { PublishFeedbackDto } from "./dto/publish-feedback.dto";
import { PublishHomeworkReviewDto } from "./dto/publish-homework-review.dto";
import { HomeworkService } from "./homework.service";

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
}
