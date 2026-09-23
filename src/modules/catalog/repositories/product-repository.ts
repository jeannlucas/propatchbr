import { db } from "@/infra/db";
import { products, plans, productVersions } from "@/infra/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { Product, Plan } from "../types";

export async function getProductWithPlans(productId?: string): Promise<Product | null> {
  try {
    const productRecord = await db.query.products.findFirst({
      where: productId ? eq(products.id, productId) : eq(products.active, true),
      with: {
        versions: {
          orderBy: [desc(productVersions.createdAt)],
        },
        plans: {
          where: eq(plans.active, true),
          orderBy: [asc(plans.priceCents)],
        },
      },
    });

    if (!productRecord) return null;

    const formattedPlans: Plan[] = productRecord.plans.map((p) => ({
      id: p.id,
      product_id: p.productId,
      name: p.name,
      price_cents: p.priceCents,
      duration: p.durationDays ? `days_${p.durationDays}` : "lifetime",
      duration_days: p.durationDays,
      is_active: p.active,
      badge: p.badge,
      description: p.description,
      features: p.features || [],
    }));

    return {
      id: productRecord.id,
      name: productRecord.name,
      description: productRecord.description,
      base_game: "Winning Eleven 10 (PS2)",
      is_active: productRecord.active,
      created_at: productRecord.createdAt.toISOString(),
      product_versions: productRecord.versions.map((v) => ({
        id: v.id,
        product_id: v.productId,
        version_name: v.version,
        release_date: v.createdAt.toISOString(),
        storage_path: v.storagePath,
        file_size_bytes: v.fileSizeBytes || 0,
        changelog: v.changelog,
      })),
      plans: formattedPlans,
    };
  } catch (error) {
    console.error("Error fetching product with plans:", error);
    return null;
  }
}

export async function getAllProductsWithPlans(): Promise<Product[]> {
  try {
    const productRecords = await db.query.products.findMany({
      where: eq(products.active, true),
      with: {
        versions: {
          orderBy: [desc(productVersions.createdAt)],
        },
        plans: {
          where: eq(plans.active, true),
          orderBy: [asc(plans.priceCents)],
        },
      },
      orderBy: [asc(products.createdAt)],
    });

    return productRecords.map((prod) => ({
      id: prod.id,
      name: prod.name,
      description: prod.description,
      base_game: "Winning Eleven 10 (PS2)",
      is_active: prod.active,
      created_at: prod.createdAt.toISOString(),
      product_versions: prod.versions.map((v) => ({
        id: v.id,
        product_id: v.productId,
        version_name: v.version,
        release_date: v.createdAt.toISOString(),
        storage_path: v.storagePath,
        file_size_bytes: v.fileSizeBytes || 0,
        changelog: v.changelog,
      })),
      plans: prod.plans.map((p) => ({
        id: p.id,
        product_id: p.productId,
        name: p.name,
        price_cents: p.priceCents,
        duration: p.durationDays ? `days_${p.durationDays}` : "lifetime",
        duration_days: p.durationDays,
        is_active: p.active,
        badge: p.badge,
        description: p.description,
        features: p.features || [],
      })),
    }));
  } catch (error) {
    console.error("Error fetching all products with plans:", error);
    return [];
  }
}
