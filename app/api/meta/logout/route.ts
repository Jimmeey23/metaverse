import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/meta";
import { clearReportCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  clearReportCache();
  const res = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}

export async function GET(request: Request) {
  return POST(request);
}
