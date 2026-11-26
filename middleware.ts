import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, hashPasscode, isGateEnabled } from "./lib/auth";

export async function middleware(req: NextRequest) {
  // No passcode configured: gate is off, let everything through.
  if (!isGateEnabled()) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie) {
    const expected = await hashPasscode(process.env.APP_PASSCODE!);
    if (cookie === expected) return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|api/login|api/logout).*)"],
};
