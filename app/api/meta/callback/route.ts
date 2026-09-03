import { NextResponse } from "next/server";
import { COOKIE_NAME, encodeSession, exchangeCode, getMe, metaConfig } from "@/lib/meta";
import { clearReportCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/mi_oauth_state=([^;]+)/)?.[1];
  const denied = url.searchParams.get("error_code") || url.searchParams.get("denied");

  if (denied || !code) {
    return NextResponse.redirect(new URL("/settings?error=denied", request.url));
  }
  if (cookieState && state && cookieState !== state) {
    return NextResponse.redirect(new URL("/settings?error=state", request.url));
  }

  try {
    const { accessToken, expiresIn } = await exchangeCode(code);
    const me = await getMe(accessToken).catch(() => null);
    const session = {
      accessToken,
      userId: String(me?.id ?? "me"),
      userName: String(me?.name ?? "Meta user"),
      picture: me?.picture?.data?.url,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (expiresIn || 60 * 60 * 24 * 60) * 1000,
    };
    clearReportCache();
    const res = NextResponse.redirect(new URL("/dashboard?connected=1", request.url));
    res.cookies.set(COOKIE_NAME, encodeSession(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
    });
    res.cookies.delete("mi_oauth_state");
    return res;
  } catch (err) {
    const message = err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return NextResponse.redirect(new URL(`/settings?error=token&message=${message}`, request.url));
  }
}
