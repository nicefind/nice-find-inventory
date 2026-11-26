import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, hashPasscode, isGateEnabled } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  // Gate off: nothing to log into.
  if (!isGateEnabled()) {
    // 303, not the default 307: after a POST, the browser must follow
    // with a GET. A 307 would make it repeat the POST to "/" — a page
    // with no POST handler — and Next.js answers that with 405.
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  const form = await req.formData();
  const code = String(form.get("code") || "");
  const passcode = process.env.APP_PASSCODE!;

  if (code !== passcode) {
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }

  const res = NextResponse.redirect(new URL("/", req.url), 303);
  res.cookies.set(COOKIE_NAME, await hashPasscode(passcode), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // stay unlocked for 30 days on this device
  });
  return res;
}
