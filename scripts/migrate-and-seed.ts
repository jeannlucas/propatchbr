import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/infra/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import path from "path";

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://propatch_user:propatch_secret_2026@127.0.0.1:5434/propatch_db";

  console.log("🚀 Conectando ao banco de dados...");
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  console.log("📦 Executando migrações Drizzle...");
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
  console.log("✅ Migrações aplicadas com sucesso!");

  // Seed
  console.log("🌱 Verificando seed inicial...");
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@propatchbr.com.br";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "AdminProPatch@2026";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.email, adminEmail),
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const [createdUser] = await db
      .insert(schema.users)
      .values({
        email: adminEmail,
        passwordHash,
        role: "admin",
      })
      .returning();

    await db.insert(schema.profiles).values({
      id: createdUser.id,
      name: "Administrador ProPatch",
      role: "admin",
    });

    console.log(`✅ Usuário administrador criado: ${adminEmail} (senha: ${adminPassword})`);
  }

  // Produto Principal
  const existingProduct = await db.query.products.findFirst({
    where: eq(schema.products.slug, "pro-patch-2026"),
  });

  let productId = existingProduct?.id;

  if (!existingProduct) {
    const [createdProduct] = await db
      .insert(schema.products)
      .values({
        name: "Pro Patch 2026",
        slug: "pro-patch-2026",
        description:
          "O patch definitivo e 100% atualizado para PlayStation 2 e OPL. Elencos 2026, Brasileirão Séries A e B, Libertadores, Champions League e narração icônica.",
        imageUrl: "/capa-we10.png",
        active: true,
      })
      .returning();

    productId = createdProduct.id;
    console.log(`✅ Produto criado: ${createdProduct.name}`);
  }

  if (productId) {
    const existingVersion = await db.query.productVersions.findFirst({
      where: eq(schema.productVersions.productId, productId),
    });

    if (!existingVersion) {
      await db.insert(schema.productVersions).values({
        productId,
        version: "1.0",
        changelog:
          "Lançamento oficial da temporada 2026. Atualização completa de elencos, kits e estádios.",
        fileName: "ProPatch-2026-v1.0.iso",
        fileSizeBytes: 2147483648,
        storagePath: "ProPatch-2026-v1.0.iso",
      });
      console.log("✅ Versão 1.0 criada");
    }

    const existingPlans = await db.query.plans.findMany({
      where: eq(schema.plans.productId, productId),
    });

    if (existingPlans.length === 0) {
      await db.insert(schema.plans).values([
        {
          productId,
          name: "Plano Trimestral",
          durationDays: 90,
          priceCents: 2990,
          active: true,
          badge: "Popular",
          description: "Acesso total por 3 meses com todas as atualizações semanais.",
          features: [
            "Download imediato da ISO v1.0",
            "Atualizações de elencos por 90 dias",
            "Compatível com OPL e Emulador PCSX2",
            "Suporte via WhatsApp",
          ],
        },
        {
          productId,
          name: "Plano Anual",
          durationDays: 365,
          priceCents: 5990,
          active: true,
          badge: "Melhor Custo-Benefício",
          description: "Temporada 2026 completa com suporte prioritário e novos estádios.",
          features: [
            "Download imediato da ISO v1.0",
            "Todas as atualizações do ano de 2026",
            "Acesso antecipado a novas versões",
            "Compatível com OPL e Emulador PCSX2",
            "Suporte prioritário via WhatsApp",
          ],
        },
        {
          productId,
          name: "Plano Vitalício",
          durationDays: 36500,
          priceCents: 9990,
          active: true,
          badge: "Acesso Eterno",
          description: "Pague uma única vez e tenha acesso a todas as atualizações para sempre.",
          features: [
            "Acesso vitalício à ISO e patches",
            "Todas as atualizações futuras sem custo",
            "Grupo VIP exclusivo de membros",
            "Suporte VIP prioritário",
          ],
        },
      ]);
      console.log("✅ Planos criados com sucesso!");
    }
  }

  console.log("🎉 Banco pronto para produção!");
  await sql.end();
  process.exit(0);
}

run().catch((e) => {
  console.error("❌ Erro ao rodar migrações/seed:", e);
  process.exit(1);
});
