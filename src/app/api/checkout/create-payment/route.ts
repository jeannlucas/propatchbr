import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/infra/db";
import { plans, payments } from "@/infra/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;
const ABACATEPAY_BASE_URL = process.env.ABACATEPAY_BASE_URL || "https://api.abacatepay.com/v2";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { planId } = body;

    if (!planId) {
      return NextResponse.json({ error: "Plano é obrigatório." }, { status: 400 });
    }

    // 1. Buscar informações do plano no banco
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, planId),
    });

    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Plano não encontrado ou inativo." }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://propatchbr.bigdevz.com";
    const uniqueBillingId = `bill_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // 2. Criar checkout na AbacatePay
    const checkoutData = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: plan.id,
          name: plan.name,
          quantity: 1,
          price: plan.priceCents,
          description: plan.description || `Acesso ao ${plan.name}`,
        },
      ],
      returnUrl: `${appUrl}/checkout/success`,
      completionUrl: `${appUrl}/dashboard`,
      metadata: {
        plan_id: plan.id,
        user_id: session.id,
        plan_name: plan.name,
        customer_email: session.email,
      },
    };

    let checkoutUrl = `${appUrl}/checkout/success`;
    let gatewayBillingId = uniqueBillingId;

    if (ABACATEPAY_API_KEY) {
      try {
        const response = await fetch(`${ABACATEPAY_BASE_URL}/checkouts/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(checkoutData),
        });

        const responseBody = await response.json();
        if (response.ok && responseBody.data?.url) {
          checkoutUrl = responseBody.data.url;
          gatewayBillingId = responseBody.data.id || uniqueBillingId;
        } else {
          console.warn("AbacatePay response error, using fallback/direct:", responseBody);
        }
      } catch (gatewayErr) {
        console.warn("AbacatePay fetch failed, falling back:", gatewayErr);
      }
    }

    // 3. Registrar registro de pagamento pendente no banco
    try {
      await db.insert(payments).values({
        userId: session.id,
        planId: plan.id,
        billingId: gatewayBillingId,
        amountCents: plan.priceCents,
        status: "PENDING",
        paymentMethod: "PIX",
        metadata: {
          plan_name: plan.name,
          customer_email: session.email,
        },
      });
    } catch (dbErr) {
      console.error("Falha ao registrar pagamento pendente:", dbErr);
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      billingId: gatewayBillingId,
    });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}