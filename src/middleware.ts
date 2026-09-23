import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "propatch_session";
const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "propatch_super_secret_session_key_min_32_characters_long_2026"
);

interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  const pathname = request.nextUrl.pathname;

  // Rotas que exigem autenticação
  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  if (!session && isProtectedPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Se já estiver logado e tentar acessar login ou cadastro
  if (session && (pathname === "/login" || pathname === "/esqueci-senha")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Rota de administração
  if (pathname.startsWith("/admin")) {
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};