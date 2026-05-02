-- CreateTable
CREATE TABLE "UserGuardian" (
    "userId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,

    CONSTRAINT "UserGuardian_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserStudent" (
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "UserStudent_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LoginFailure" (
    "userId" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastSucceededAt" TIMESTAMP(3),

    CONSTRAINT "LoginFailure_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserGuardian_guardianId_idx" ON "UserGuardian"("guardianId");

-- CreateIndex
CREATE INDEX "UserStudent_studentId_idx" ON "UserStudent"("studentId");

-- AddForeignKey
ALTER TABLE "UserGuardian" ADD CONSTRAINT "UserGuardian_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuardian" ADD CONSTRAINT "UserGuardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudent" ADD CONSTRAINT "UserStudent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStudent" ADD CONSTRAINT "UserStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginFailure" ADD CONSTRAINT "LoginFailure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
