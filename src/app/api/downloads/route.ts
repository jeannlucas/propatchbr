import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/infra/db";
import { productVersions, licenses } from "@/infra/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { SignJWT } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "propatch_super_secret_session_key_min_32_characters_long_2026"
);

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json(
        { error: "Identificador da versão é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Buscar a versão do produto no banco
    const version = await db.query.productVersions.findFirst({
      where: eq(productVersions.id, versionId),
    });

    if (!version) {
      return NextResponse.json(
        { error: "Versão do produto não encontrada." },
        { status: 404 }
      );
    }

    // 2. Validar se o usuário possui licença ativa para o produto
    const activeLicense = await db.query.licenses.findFirst({
      where: and(
        eq(licenses.userId, session.id),
        eq(licenses.productId, version.productId),
        eq(licenses.status, "active"),
        gt(licenses.expiresAt, new Date())
      ),
    });

    if (!activeLicense) {
      return NextResponse.json(
        { error: "Você não possui uma licença ativa para baixar esta versão." },
        { status: 403 }
      );
    }

    // 3. Gerar token criptográfico assinado com validade de 2 horas
    const downloadToken = await new SignJWT({
      userId: session.id,
      versionId: version.id,
      storagePath: version.storagePath,
      fileName: version.fileName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(SECRET_KEY);

    const downloadUrl = `/api/downloads/file?token=${downloadToken}`;

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error("Erro interno no endpoint de download:", error);
    return NextResponse.json(
      { error: "Falha ao gerar link seguro de download." },
      { status: 500 }
    );
  }
}