-- CreateEnum
CREATE TYPE "SimilarQuestionStatus" AS ENUM ('candidate', 'selected', 'dismissed');

-- CreateEnum
CREATE TYPE "PracticeSheetStatus" AS ENUM ('generating', 'ready', 'failed');

-- CreateTable
CREATE TABLE "MistakeSimilarQuestion" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mistakeItemId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "explanation" TEXT,
    "status" "SimilarQuestionStatus" NOT NULL DEFAULT 'candidate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MistakeSimilarQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeSheet" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT,
    "fileUrl" TEXT,
    "status" "PracticeSheetStatus" NOT NULL DEFAULT 'generating',
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeSheet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MistakeSimilarQuestion" ADD CONSTRAINT "MistakeSimilarQuestion_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeSimilarQuestion" ADD CONSTRAINT "MistakeSimilarQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MistakeSimilarQuestion" ADD CONSTRAINT "MistakeSimilarQuestion_mistakeItemId_fkey" FOREIGN KEY ("mistakeItemId") REFERENCES "MistakeBookItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSheet" ADD CONSTRAINT "PracticeSheet_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSheet" ADD CONSTRAINT "PracticeSheet_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSheet" ADD CONSTRAINT "PracticeSheet_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
