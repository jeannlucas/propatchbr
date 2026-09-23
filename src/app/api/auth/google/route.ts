import { NextRequest, NextResponse } from "next/server";
import { getSafeRedirectUrl } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirectParam = searchParams.get("redirect") || "/dashboard";
  const safeRedirect = getSafeRedirectUrl(redirectParam, "/dashboard");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth não configurado no servidor." }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://propatchbr.bigdevz.com";
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", encodeURIComponent(safeRedirect));

  return NextResponse.redirect(googleAuthUrl.toString());
}
