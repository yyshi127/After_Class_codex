import type { UserRole } from "@prisma/client";

export type AuthCampus = {
  id: string;
  name: string;
};

export type AuthenticatedUser = {
  id: string;
  name: string;
  phone: string | null;
  role: UserRole;
  campusIds: string[];
  campuses?: AuthCampus[];
};

export type AuthRequest = {
  headers: {
    authorization?: string;
  };
  user?: AuthenticatedUser;
};
