-- CreateEnum
CREATE TYPE "HomeworkStatus" AS ENUM ('pending', 'completed', 'needs_correction');

-- CreateEnum
CREATE TYPE "HomeworkImageType" AS ENUM ('original', 'reviewed', 'ai_marked');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "MistakeStatus" AS ENUM ('candidate', 'confirmed', 'dismissed');

-- CreateTable
CREATE TABLE "HomeworkReview" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "subject" TEXT,
    "status" "HomeworkStatus" NOT NULL DEFAULT 'pending',
    "teacherComment" TEXT,
    "aiSummary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeworkReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeworkReviewImage" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "type" "HomeworkImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkReviewImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "behavior" TEXT NOT NULL,
    "homework" TEXT NOT NULL,
    "knowledge" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MistakeBookItem" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reviewId" TEXT,
    "subject" TEXT,
    "knowledgePoint" TEXT,
    "question" TEXT,
    "answer" TEXT,
    "explanation" TEXT,
    "status" "MistakeStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MistakeBookItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HomeworkReview" ADD CONSTRAINT "HomeworkReview_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkReview" ADD CONSTRAINT "HomeworkReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkReview" ADD CONSTRAINT "HomeworkReview_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeworkReviewImage" ADD CONSTRAINT "HomeworkReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "HomeworkReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeBookItem" ADD CONSTRAINT "MistakeBookItem_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeBookItem" ADD CONSTRAINT "MistakeBookItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeBookItem" ADD CONSTRAINT "MistakeBookItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "HomeworkReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;
