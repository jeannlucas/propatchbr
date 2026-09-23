import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import path from "path";
import fs from "fs";
import { db } from "@/infra/db";
import { downloadLogs } from "@/infra/db/schema";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "propatch_super_secret_session_key_min_32_characters_long_2026"
);

interface DownloadTokenPayload {
  userId: string;
  versionId: string;
  storagePath: string;
  fileName: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token de download ausente." }, { status: 400 });
    }

    let payload: DownloadTokenPayload;
    try {
      const verified = await jwtVerify(token, SECRET_KEY);
      payload = verified.payload as unknown as DownloadTokenPayload;
    } catch {
      return NextResponse.json(
        { error: "Link de download expirado ou inválido. Gere um novo link no painel." },
        { status: 403 }
      );
    }

    // Diretório base dos arquivos de patch
    const storageDir = process.env.STORAGE_LOCAL_PATH || path.join(process.cwd(), "storage", "patches");
    
    // Prevenção contra Directory Traversal
    const safeBaseName = path.basename(payload.storagePath);
    const filePath = path.join(/*turbopackIgnore: true*/ storageDir, safeBaseName);

    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      // Se ainda não existir a ISO oficial no diretório local, cria um arquivo de instrução para teste
      if (!fs.existsSync(/*turbopackIgnore: true*/ storageDir)) {
        fs.mkdirSync(/*turbopackIgnore: true*/ storageDir, { recursive: true });
      }
      fs.writeFileSync(
        /*turbopackIgnore: true*/ filePath,
        `ProPatch BR - Arquivo ${payload.fileName}\nVersão: ${payload.versionId}\nData: ${new Date().toISOString()}\nEste é um placeholder para demonstração.`
      );
    }

    const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");

    // Registro do download no banco
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    try {
      await db.insert(downloadLogs).values({
        userId: payload.userId,
        productVersionId: payload.versionId,
        downloadStatus: "completed",
        ipAddress: clientIp,
      });
    } catch (e) {
      console.error("Falha ao registrar download_log:", e);
    }

    // Suporte a HTTP 206 Partial Content (Range Requests para downloads retomáveis e acelerados)
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath, { start, end });
      // Converter Node ReadableStream para Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.fileName)}"`,
        },
      });
    }

    // Download completo
    const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "application/octet-stream",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(payload.fileName)}"`,
      },
    });
  } catch (error) {
    console.error("Erro no streaming do download:", error);
    return NextResponse.json(
      { error: "Erro ao processar o arquivo de download." },
      { status: 500 }
    );
  }
}
