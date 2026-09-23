import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/infra/db";
import { licenses, profiles, productVersions } from "@/infra/db/schema";
import { eq, desc } from "drizzle-orm";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.id) {
    redirect("/login");
  }

  // 1. Buscar perfil do usuário
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.id),
  });

  // 2. Buscar licenças do usuário
  const userLicenses = await db.query.licenses.findMany({
    where: eq(licenses.userId, session.id),
    orderBy: [desc(licenses.createdAt)],
    with: {
      product: {
        with: {
          versions: {
            orderBy: [desc(productVersions.createdAt)],
          },
        },
      },
    },
  });

  // 3. Formatar para o DashboardClient
  const formattedEntitlements = userLicenses.map((lic) => {
    return {
      id: lic.id,
      valid_until: lic.expiresAt ? lic.expiresAt.toISOString() : null,
      metadata: null,
      product_id: lic.productId,
      products: lic.product
        ? {
            name: lic.product.name,
            product_versions: lic.product.versions.map((v) => ({
              id: v.id,
              version_name: v.version,
              storage_path: v.storagePath,
            })),
          }
        : null,
    };
  });

  return (
    <DashboardClient
      entitlements={formattedEntitlements}
      profile={profile ? { full_name: profile.name } : { full_name: session.name }}
      userEmail={session.email}
    />
  );
}