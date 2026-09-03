import { NextResponse } from "next/server";
import { clearReportCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  clearReportCache();
  return NextResponse.redirect(new URL("/settings?cleared=1", request.url));
}
