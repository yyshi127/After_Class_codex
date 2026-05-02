export type AuthCampus = {
  id: string;
  name: string;
};

export type AuthUser = {
  id: string;
  name: string;
  phone: string | null;
  role: "admin" | "teacher" | "guardian" | "student";
  campusIds: string[];
  campuses?: AuthCampus[];
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export const AUTH_TOKEN_KEY = "afterclass_access_token";
export const AUTH_USER_KEY = "afterclass_user";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
}

export function saveSession(response: LoginResponse) {
  localStorage.setItem(AUTH_TOKEN_KEY, response.accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearSession();
    return null;
  }
}

export async function login(phone: string, password: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, password }),
  });

  if (!response.ok) {
    throw new Error("账号或密码错误");
  }

  return (await response.json()) as LoginResponse;
}

export async function loadMe(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("登录状态已失效");
  }

  return (await response.json()) as { user: AuthUser };
}
