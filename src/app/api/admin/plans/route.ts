import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { db } from "@/infra/db";
import { plans } from "@/infra/db/schema";
import { eq, asc } from "drizzle-orm";

async function checkAdminAuth() {
  const session = await getSession();

  if (!session?.id) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  if (session.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Acesso administrativo não autorizado." },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user: session };
}

export async function GET() {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    const allPlans = await db.query.plans.findMany({
      orderBy: [asc(plans.priceCents)],
    });

    const formattedPlans = allPlans.map((p) => ({
      id: p.id,
      productId: p.productId,
      name: p.name,
      price_cents: p.priceCents,
      duration_days: p.durationDays,
      duration: p.durationDays ? `days_${p.durationDays}` : "lifetime",
      is_active: p.active,
      active: p.active,
      badge: p.badge,
      description: p.description,
      features: p.features,
    }));

    return NextResponse.json({ plans: formattedPlans });
  } catch (err) {
    console.error("Admin plans GET error:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCheck = await checkAdminAuth();
    if (!authCheck.authorized) return authCheck.response;

    const body = await request.json().catch(() => ({}));
    const { id, name, price_cents, priceCents, duration_days, durationDays, is_active, active, badge, description } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID do plano é obrigatório." }, { status: 400 });
    }

    const rawPrice = price_cents !== undefined ? price_cents : priceCents;
    const priceCentsNum = Number(rawPrice);
    if (isNaN(priceCentsNum) || priceCentsNum <= 0 || !Number.isInteger(priceCentsNum)) {
      return NextResponse.json(
        { error: "O preço em centavos deve ser um número inteiro positivo maior que zero." },
        { status: 400 }
      );
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 100) {
      return NextResponse.json(
        { error: "O nome do plano é obrigatório e deve ter até 100 caracteres." },
        { status: 400 }
      );
    }

    const rawDuration = duration_days !== undefined ? duration_days : durationDays;
    const dNum = Number(rawDuration);
    if (isNaN(dNum) || dNum <= 0) {
      return NextResponse.json(
        { error: "A duração em dias deve ser um número positivo." },
        { status: 400 }
      );
    }
    const parsedDurationDays = Math.floor(dNum);
    const activeValue = is_active !== undefined ? Boolean(is_active) : (active !== undefined ? Boolean(active) : true);

    const [updatedPlan] = await db
      .update(plans)
      .set({
        name: trimmedName,
        priceCents: priceCentsNum,
        durationDays: parsedDurationDays,
        active: activeValue,
        badge: badge ? String(badge).trim() : null,
        description: description ? String(description).trim() : null,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    return NextResponse.json({ success: true, plan: updatedPlan });
  } catch (err) {
    console.error("Admin plans PUT error:", err);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}
