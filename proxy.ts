import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getSessionToken } from "@/lib/adminAuth";

export function proxy(request: NextRequest) {
  const isAuthed = request.cookies.get(ADMIN_COOKIE)?.value === getSessionToken();

  if (!isAuthed) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
