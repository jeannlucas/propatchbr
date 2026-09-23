import { db } from "./index";
import { users, profiles, products, productVersions, plans } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // 1. Criar usuário Admin inicial
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@propatchbr.com.br";
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "AdminProPatch@2026";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, adminEmail),
  });

  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const [createdUser] = await db
      .insert(users)
      .values({
        email: adminEmail,
        passwordHash,
        role: "admin",
      })
      .returning();

    await db.insert(profiles).values({
      id: createdUser.id,
      name: "Administrador ProPatch",
      role: "admin",
    });

    console.log(`✅ Usuário administrador criado: ${adminEmail} (senha: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Usuário administrador já existe: ${adminEmail}`);
  }

  // 2. Criar Produto Principal: Bomba Patch 2026
  const existingProduct = await db.query.products.findFirst({
    where: eq(products.slug, "bomba-patch-2026"),
  });

  let productId = existingProduct?.id;

  if (!existingProduct) {
    const [createdProduct] = await db
      .insert(products)
      .values({
        name: "Bomba Patch 2026 PS2",
        slug: "bomba-patch-2026",
        description: "O patch definitivo e 100% atualizado para PlayStation 2 e OPL. Elencos 2026, Brasileirão Séries A e B, Libertadores, Champions League e narração icônica.",
        imageUrl: "/img/bomba-patch-2026-cover.webp",
        active: true,
      })
      .returning();

    productId = createdProduct.id;
    console.log(`✅ Produto criado: ${createdProduct.name} (${createdProduct.id})`);
  } else {
    console.log(`ℹ️ Produto já existente: ${existingProduct.name}`);
  }

  if (productId) {
    // 3. Criar Versão Inicial (v1.0)
    const existingVersion = await db.query.productVersions.findFirst({
      where: eq(productVersions.productId, productId),
    });

    if (!existingVersion) {
      await db.insert(productVersions).values({
        productId,
        version: "1.0",
        changelog: "Lançamento oficial da temporada 2026. Atualização completa de elencos, kits e estádios.",
        fileName: "ProPatch-2026-v1.0.iso",
        fileSizeBytes: 2147483648, // ~2.1 GB
        storagePath: "ProPatch-2026-v1.0.iso",
      });
      console.log("✅ Versão 1.0 criada");
    }

    // 4. Criar Planos
    const existingPlans = await db.query.plans.findMany({
      where: eq(plans.productId, productId),
    });

    if (existingPlans.length === 0) {
      await db.insert(plans).values([
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
          durationDays: 36500, // 100 anos
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
      console.log("✅ Planos criados com sucesso (Trimestral, Anual e Vitalício)");
    }
  }

  console.log("🎉 Seed finalizado com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro durante o seed:", err);
  process.exit(1);
});
