-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('paid', 'partial', 'unpaid', 'refunded');

-- CreateEnum
CREATE TYPE "ClassSettlementStatus" AS ENUM ('draft', 'confirmed');

-- CreateTable
CREATE TABLE "BillingRecord" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "serviceTypeId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amountDueCents" INTEGER NOT NULL,
    "amountPaidCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "status" "BillingStatus" NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherFeeConfig" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "feePerAttendCents" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSettlement" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "studentAttendCount" INTEGER NOT NULL,
    "incomeCents" INTEGER NOT NULL,
    "teacherFeeCents" INTEGER NOT NULL,
    "grossProfitCents" INTEGER NOT NULL,
    "status" "ClassSettlementStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingRecord_campusId_periodStart_periodEnd_idx" ON "BillingRecord"("campusId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BillingRecord_studentId_periodStart_periodEnd_idx" ON "BillingRecord"("studentId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ClassSettlement_campusId_periodStart_periodEnd_idx" ON "ClassSettlement"("campusId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "ClassSettlement_classId_periodStart_periodEnd_idx" ON "ClassSettlement"("classId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecord" ADD CONSTRAINT "BillingRecord_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFeeConfig" ADD CONSTRAINT "TeacherFeeConfig_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFeeConfig" ADD CONSTRAINT "TeacherFeeConfig_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFeeConfig" ADD CONSTRAINT "TeacherFeeConfig_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSettlement" ADD CONSTRAINT "ClassSettlement_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSettlement" ADD CONSTRAINT "ClassSettlement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSettlement" ADD CONSTRAINT "ClassSettlement_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
