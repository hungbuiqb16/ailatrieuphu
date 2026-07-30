import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminPassword, getSessionToken } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };

  if (password !== getAdminPassword()) {
    return NextResponse.json({ ok: false, message: "Mật khẩu không đúng" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, getSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
