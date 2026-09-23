import { NextRequest, NextResponse } from "next/server";
import { getSafeRedirectUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawRedirect = searchParams.get("redirect");
  const safeRedirect = getSafeRedirectUrl(rawRedirect, "/dashboard");

  return NextResponse.redirect(new URL(safeRedirect, request.url));
}