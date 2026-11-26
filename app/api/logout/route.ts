import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
