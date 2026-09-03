import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { buildAuthUrl, metaConfig } from "@/lib/meta";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { configured } = metaConfig();
  if (!configured) {
    const url = new URL("/settings?error=not_configured", request.url);
    return NextResponse.redirect(url);
  }
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthUrl(state));
  res.cookies.set("mi_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
