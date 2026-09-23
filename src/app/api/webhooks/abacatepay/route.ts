import { NextRequest, NextResponse } from "next/server";
import { db } from "@/infra/db";
import { payments, plans, licenses } from "@/infra/db/schema";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";

interface WebhookCheckout {
  id: string;
  amount: number;
  metadata?: {
    order_id?: string;
    billing_id?: string;
    user_id?: string;
    plan_id?: string;
    plan_name?: string;
    customer_email?: string;
  };
}

interface WebhookBody {
  event?: string;
  data?: {
    checkout?: WebhookCheckout;
  };
}

function generateLicenseKey(): string {
  const segment = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PRO-${segment()}-${segment()}-${segment()}`;
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signatureHeader =
        request.headers.get("x-webhook-secret") ||
        request.headers.get("x-signature") ||
        request.headers.get("authorization")?.replace("Bearer ", "");
      const searchSecret = request.nextUrl.searchParams.get("secret");

      const providedSecret = signatureHeader || searchSecret;

      if (!providedSecret || providedSecret !== webhookSecret) {
        console.warn("⚠️ Webhook rejection: Invalid or missing webhook secret.");
        return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
      }
    }

    const rawBody = await request.text();
    let body: WebhookBody;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("=== WEBHOOK RECEIVED ===", body.event);

    if (body.event === "checkout.completed" && body.data?.checkout) {
      const checkout = body.data.checkout;
      const checkoutId = checkout.id;
      const metadata = checkout.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;

      if (!userId || !planId) {
        console.error("Missing user_id or plan_id in webhook metadata:", metadata);
        return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
      }

      // 1. Buscar o plano
      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, planId),
      });

      if (!plan) {
        console.error("Plan not found for id:", planId);
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }

      // 2. Atualizar ou inserir pagamento no banco
      const existingPayment = await db.query.payments.findFirst({
        where: eq(payments.billingId, checkoutId),
      });

      if (existingPayment) {
        await db
          .update(payments)
          .set({
            status: "PAID",
            amountCents: checkout.amount || existingPayment.amountCents,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, existingPayment.id));
      } else {
        await db.insert(payments).values({
          userId,
          planId: plan.id,
          billingId: checkoutId,
          amountCents: checkout.amount || plan.priceCents,
          status: "PAID",
          paymentMethod: "PIX",
          metadata: metadata,
        });
      }

      // 3. Gerenciar Licença
      const durationDays = plan.durationDays;
      const now = Date.now();

      // Verificar se usuário já possui licença ativa para o mesmo produto
      const existingLicense = await db.query.licenses.findFirst({
        where: and(
          eq(licenses.userId, userId),
          eq(licenses.productId, plan.productId),
          eq(licenses.status, "active"),
          gt(licenses.expiresAt, new Date())
        ),
      });

      let expiresAt: Date;
      if (existingLicense && existingLicense.expiresAt.getTime() > now) {
        // Estender validade cumulativa
        expiresAt = new Date(existingLicense.expiresAt.getTime() + durationDays * 86400000);
        await db
          .update(licenses)
          .set({
            planId: plan.id,
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(licenses.id, existingLicense.id));
        console.log(`✅ Licença ${existingLicense.licenseKey} estendida até ${expiresAt.toISOString()}`);
      } else {
        // Criar nova licença
        expiresAt = new Date(now + durationDays * 86400000);
        const licenseKey = generateLicenseKey();
        await db.insert(licenses).values({
          userId,
          productId: plan.productId,
          planId: plan.id,
          licenseKey,
          status: "active",
          startsAt: new Date(),
          expiresAt,
        });
        console.log(`✅ Nova licença gerada: ${licenseKey} válida até ${expiresAt.toISOString()}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ received: false, error: "Internal error" }, { status: 500 });
  }
}