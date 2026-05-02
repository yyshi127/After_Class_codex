import { PrismaClient, UserRole, BillingCycle } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Admin123456", 10);

  const campus = await prisma.campus.upsert({
    where: { id: "seed-campus-main" },
    update: {},
    create: {
      id: "seed-campus-main",
      name: "星河校区",
      address: "示例市星河路 88 号",
    },
  });

  const admin = await prisma.user.upsert({
    where: { phone: "13800000000" },
    update: {
      name: "系统管理员",
      role: UserRole.admin,
      campusId: campus.id,
      passwordHash,
    },
    create: {
      name: "系统管理员",
      phone: "13800000000",
      role: UserRole.admin,
      campusId: campus.id,
      passwordHash,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { phone: "13800000001" },
    update: {
      name: "王老师",
      role: UserRole.teacher,
      campusId: campus.id,
      passwordHash,
    },
    create: {
      name: "王老师",
      phone: "13800000001",
      role: UserRole.teacher,
      campusId: campus.id,
      passwordHash,
    },
  });

  const guardianUser = await prisma.user.upsert({
    where: { phone: "13800000002" },
    update: {
      name: "李同学家长",
      role: UserRole.guardian,
      campusId: campus.id,
      passwordHash,
    },
    create: {
      name: "李同学家长",
      phone: "13800000002",
      role: UserRole.guardian,
      campusId: campus.id,
      passwordHash,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { phone: "13800000003" },
    update: {
      name: "李明",
      role: UserRole.student,
      campusId: campus.id,
      passwordHash,
    },
    create: {
      name: "李明",
      phone: "13800000003",
      role: UserRole.student,
      campusId: campus.id,
      passwordHash,
    },
  });

  const classOne = await prisma.class.upsert({
    where: { id: "seed-class-one" },
    update: {},
    create: {
      id: "seed-class-one",
      campusId: campus.id,
      name: "晚辅一班",
    },
  });

  await prisma.userCampus.upsert({
    where: { userId_campusId: { userId: admin.id, campusId: campus.id } },
    update: {},
    create: { userId: admin.id, campusId: campus.id },
  });

  await prisma.userCampus.upsert({
    where: { userId_campusId: { userId: guardianUser.id, campusId: campus.id } },
    update: {},
    create: { userId: guardianUser.id, campusId: campus.id },
  });

  await prisma.userCampus.upsert({
    where: { userId_campusId: { userId: studentUser.id, campusId: campus.id } },
    update: {},
    create: { userId: studentUser.id, campusId: campus.id },
  });

  await prisma.userCampus.upsert({
    where: { userId_campusId: { userId: teacher.id, campusId: campus.id } },
    update: {},
    create: { userId: teacher.id, campusId: campus.id },
  });

  await prisma.teacherClass.upsert({
    where: { teacherId_classId: { teacherId: teacher.id, classId: classOne.id } },
    update: {},
    create: { teacherId: teacher.id, classId: classOne.id },
  });

  const serviceTypes = [
    ["noon-care", "中午托", true, true, true, false],
    ["afternoon-care", "下午托", true, true, false, false],
    ["homework-only", "晚辅导", false, false, false, true],
    ["full-evening-care", "晚全托", true, true, false, true],
  ] as const;

  for (const [code, name, includesPickup, includesMeal, includesRest, includesHomeworkHelp] of serviceTypes) {
    await prisma.serviceType.upsert({
      where: { code },
      update: { name, includesPickup, includesMeal, includesRest, includesHomeworkHelp },
      create: { code, name, includesPickup, includesMeal, includesRest, includesHomeworkHelp },
    });
  }

  const guardian = await prisma.guardian.upsert({
    where: { phone: "13800000002" },
    update: { name: "李同学家长" },
    create: { name: "李同学家长", phone: "13800000002" },
  });

  const student = await prisma.student.upsert({
    where: { id: "seed-student-one" },
    update: { classId: classOne.id },
    create: {
      id: "seed-student-one",
      campusId: campus.id,
      classId: classOne.id,
      name: "李明",
      gender: "男",
      grade: "三年级",
      schoolName: "星河小学",
      idCardNoEncrypted: "seed-encrypted-placeholder",
    },
  });

  await prisma.guardianStudent.upsert({
    where: { guardianId_studentId: { guardianId: guardian.id, studentId: student.id } },
    update: { relation: "母亲" },
    create: { guardianId: guardian.id, studentId: student.id, relation: "母亲" },
  });

  await prisma.userGuardian.upsert({
    where: { userId: guardianUser.id },
    update: { guardianId: guardian.id },
    create: { userId: guardianUser.id, guardianId: guardian.id },
  });

  await prisma.userStudent.upsert({
    where: { userId: studentUser.id },
    update: { studentId: student.id },
    create: { userId: studentUser.id, studentId: student.id },
  });

  const homeworkOnly = await prisma.serviceType.findUniqueOrThrow({ where: { code: "homework-only" } });
  await prisma.studentService.upsert({
    where: { id: "seed-student-service-one" },
    update: {},
    create: {
      id: "seed-student-service-one",
      studentId: student.id,
      serviceTypeId: homeworkOnly.id,
      billingCycle: BillingCycle.monthly,
      validFrom: new Date("2026-05-01T00:00:00.000Z"),
      validTo: new Date("2026-05-31T23:59:59.000Z"),
    },
  });

  console.log("Seed complete.");
  console.log("Admin login: 13800000000 / Admin123456");
  console.log("Teacher login: 13800000001 / Admin123456");
  console.log("Guardian login: 13800000002 / Admin123456");
  console.log("Student login: 13800000003 / Admin123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
