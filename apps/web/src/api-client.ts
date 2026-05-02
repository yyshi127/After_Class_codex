import { clearSession, getApiBaseUrl, getStoredToken } from "./auth-client";

export type CampusOption = {
  id: string;
  name: string;
};

export type ClassItem = {
  id: string;
  campusId: string;
  name: string;
  campus?: CampusOption;
  teachers?: Array<{ teacher: { id: string; name: string; phone: string | null } }>;
  _count?: { students: number };
};

export type StudentItem = {
  id: string;
  campusId: string;
  classId: string | null;
  name: string;
  gender: string | null;
  grade: string | null;
  schoolName: string | null;
  status: string;
  idCardNoMasked: string | null;
  campus?: CampusOption;
  class?: { id: string; name: string } | null;
};

export type StudentAttendanceItem = {
  id: string;
  campusId: string;
  studentId: string;
  status: "pending" | "checked_in" | "checked_out" | "leave" | "absent";
  photoUrl: string | null;
  occurredAt: string;
  student?: {
    id: string;
    name: string;
    class?: { id: string; name: string } | null;
  };
};

export type TeacherAttendanceItem = {
  id: string;
  campusId: string;
  teacherId: string;
  status: "checked_in" | "checked_out";
  occurredAt: string;
  note: string | null;
};

export type HomeworkReviewItem = {
  id: string;
  campusId: string;
  studentId: string;
  teacherId: string;
  classId: string | null;
  subject: string | null;
  status: "pending" | "completed" | "needs_correction";
  teacherComment: string | null;
  aiSummary: string | null;
  publishedAt: string | null;
  createdAt: string;
  student?: {
    id: string;
    name: string;
    class?: { id: string; name: string } | null;
  };
  teacher?: { id: string; name: string };
  images?: Array<{
    id: string;
    reviewId: string;
    type: "original" | "reviewed" | "ai_marked";
    url: string;
    sortOrder: number;
  }>;
  mistakes?: Array<{ id: string; status: "candidate" | "confirmed" | "dismissed" }>;
};

export type FeedbackItem = {
  id: string;
  campusId: string;
  studentId: string;
  teacherId: string;
  behavior: string;
  homework: string;
  knowledge: string;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  student?: { id: string; name: string };
  teacher?: { id: string; name: string };
};

export type UploadedFileObject = {
  id: string;
  campusId: string;
  studentId: string | null;
  objectKey: string;
  mimeType: string;
  size: number;
  type: "checkin_photo" | "homework_original" | "homework_reviewed" | "homework_ai_marked" | "practice_sheet";
  signedUrl: string;
};

export type NotificationItem = {
  id: string;
  campusId: string | null;
  studentId: string | null;
  guardianId: string | null;
  recipientUserId: string | null;
  title: string;
  content: string;
  status: "pending" | "sent" | "failed";
  sentAt: string | null;
  failReason: string | null;
  createdAt: string;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("登录状态已失效");
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

export function listStudents(params: { campusId?: string; classId?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set("campusId", params.campusId);
  if (params.classId) search.set("classId", params.classId);
  if (params.status) search.set("status", params.status);
  const query = search.toString();
  return apiRequest<StudentItem[]>(`/students${query ? `?${query}` : ""}`);
}

export function createStudent(payload: {
  campusId: string;
  classId?: string;
  name: string;
  gender?: string;
  grade?: string;
  schoolName?: string;
  idCardNo?: string;
}) {
  return apiRequest<StudentItem>("/students", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listClasses(campusId?: string) {
  const query = campusId ? `?campusId=${encodeURIComponent(campusId)}` : "";
  return apiRequest<ClassItem[]>(`/classes${query}`);
}

export function createClass(payload: { campusId: string; name: string }) {
  return apiRequest<ClassItem>("/classes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listStudentAttendance(params: { campusId?: string; studentId?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set("campusId", params.campusId);
  if (params.studentId) search.set("studentId", params.studentId);
  const query = search.toString();
  return apiRequest<StudentAttendanceItem[]>(`/attendance/students${query ? `?${query}` : ""}`);
}

export function checkInStudent(payload: { studentId: string; photoUrl?: string }) {
  return apiRequest<StudentAttendanceItem>("/attendance/students/check-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listTeacherAttendance(campusId?: string) {
  const query = campusId ? `?campusId=${encodeURIComponent(campusId)}` : "";
  return apiRequest<TeacherAttendanceItem[]>(`/attendance/teachers${query}`);
}

export function teacherCheckIn(payload: { campusId: string; note?: string }) {
  return apiRequest<TeacherAttendanceItem>("/attendance/teachers/check-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function teacherCheckOut(payload: { campusId: string; note?: string }) {
  return apiRequest<TeacherAttendanceItem>("/attendance/teachers/check-out", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listHomeworkReviews(params: { campusId?: string; studentId?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set("campusId", params.campusId);
  if (params.studentId) search.set("studentId", params.studentId);
  const query = search.toString();
  return apiRequest<HomeworkReviewItem[]>(`/homework/reviews${query ? `?${query}` : ""}`);
}

export function createHomeworkReview(payload: {
  studentId: string;
  subject?: string;
  originalImageUrl: string;
  teacherComment?: string;
}) {
  return apiRequest<HomeworkReviewItem>("/homework/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function publishHomeworkReview(id: string, payload: { reviewedImageUrl?: string; teacherComment?: string }) {
  return apiRequest<HomeworkReviewItem>(`/homework/reviews/${id}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listFeedback(params: { campusId?: string; studentId?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set("campusId", params.campusId);
  if (params.studentId) search.set("studentId", params.studentId);
  const query = search.toString();
  return apiRequest<FeedbackItem[]>(`/feedback${query ? `?${query}` : ""}`);
}

export function publishFeedback(payload: { studentId: string; behavior: string; homework: string; knowledge: string }) {
  return apiRequest<FeedbackItem>("/feedback", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadImage(payload: {
  file: File;
  campusId: string;
  studentId?: string;
  type: UploadedFileObject["type"];
  businessType?: string;
  businessId?: string;
}) {
  const token = getStoredToken();
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("campusId", payload.campusId);
  if (payload.studentId) formData.set("studentId", payload.studentId);
  formData.set("type", payload.type);
  if (payload.businessType) formData.set("businessType", payload.businessType);
  if (payload.businessId) formData.set("businessId", payload.businessId);

  const response = await fetch(`${getApiBaseUrl()}/files/images`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (response.status === 401) {
    clearSession();
    throw new Error("登录状态已失效");
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as UploadedFileObject;
}

export async function getFileSignedUrl(id: string) {
  return apiRequest<{ id: string; signedUrl: string; expiresIn: number }>(`/files/${id}/signed-url`);
}

export function listNotifications(params: { campusId?: string; studentId?: string }) {
  const search = new URLSearchParams();
  if (params.campusId) search.set("campusId", params.campusId);
  if (params.studentId) search.set("studentId", params.studentId);
  const query = search.toString();
  return apiRequest<NotificationItem[]>(`/notifications${query ? `?${query}` : ""}`);
}
