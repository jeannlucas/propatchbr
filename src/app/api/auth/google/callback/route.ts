import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infra/db";
import { users, profiles } from "@/infra/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { setSessionCookie, createSessionToken } from "@/lib/auth/session";
import { getSafeRedirectUrl } from "@/lib/utils";

interface GoogleTokenResponse {
  access_token?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email?: boolean;
  name: string;
  given_name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://propatchbr.bigdevz.com";
  const redirectParam = state ? decodeURIComponent(state) : "/dashboard";
  const safeRedirect = getSafeRedirectUrl(redirectParam, "/dashboard");

  if (error || !code) {
    console.error("Google OAuth error or code missing:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_denied", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return NextResponse.redirect(new URL("/login?error=server_configuration", request.url));
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 1. Trocar código pelo Token de Acesso do Google
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData: GoogleTokenResponse = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Failed to exchange code with Google:", tokenData);
      return NextResponse.redirect(new URL("/login?error=google_token_exchange", request.url));
    }

    // 2. Buscar informações do perfil do usuário no Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userInfo: GoogleUserInfo = await userInfoRes.json();

    if (!userInfoRes.ok || !userInfo.email) {
      console.error("Failed to fetch Google user info:", userInfo);
      return NextResponse.redirect(new URL("/login?error=google_profile_fetch", request.url));
    }

    const email = userInfo.email.trim().toLowerCase();
    const name = userInfo.name || userInfo.given_name || email.split("@")[0];
    const avatarUrl = userInfo.picture || null;

    // 3. Buscar ou criar o usuário no banco de dados local
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Criar hash de senha aleatória e segura para o usuário OAuth
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomSecret, 10);

      const [createdUser] = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            email,
            passwordHash,
            role: "user",
          })
          .returning();

        await tx.insert(profiles).values({
          id: newUser.id,
          name,
          avatarUrl,
          role: "user",
        });

        return [newUser];
      });

      user = createdUser;
    } else {
      // Se já existia, garante que o avatar ou nome sejam atualizados se estiverem vazios
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, user.id),
      });

      if (!profile) {
        await db.insert(profiles).values({
          id: user.id,
          name,
          avatarUrl,
          role: user.role,
        });
      } else if (avatarUrl && !profile.avatarUrl) {
        await db.update(profiles).set({ avatarUrl }).where(eq(profiles.id, user.id));
      }
    }

    // 4. Obter o perfil final para a sessão
    const finalProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });

    // 5. Emitir o token JWT nativo de sessão e salvar o cookie
    const sessionToken = await createSessionToken({
      id: user.id,
      email: user.email,
      name: finalProfile?.name || name,
      role: user.role,
    });

    await setSessionCookie(sessionToken);

    // 6. Redirecionar com sucesso
    return NextResponse.redirect(new URL(safeRedirect, request.url));
  } catch (error) {
    console.error("Google OAuth callback exception:", error);
    return NextResponse.redirect(new URL("/login?error=internal_auth_error", request.url));
  }
}
