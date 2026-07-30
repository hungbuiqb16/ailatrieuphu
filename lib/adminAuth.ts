import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "atp_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123";
}

export function getSessionToken(): string {
  // Token cố định phái sinh từ mật khẩu, đủ dùng cho bảo vệ nội bộ đơn giản.
  return Buffer.from(`atp:${getAdminPassword()}`).toString("base64");
}

export function isAdminRequest(req: NextRequest): boolean {
  return req.cookies.get(ADMIN_COOKIE)?.value === getSessionToken();
}
