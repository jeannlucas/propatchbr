'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/infra/db';
import { users, profiles, passwordResetTokens } from '@/infra/db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { setSessionCookie, createSessionToken, destroySession } from '@/lib/auth/session';
import { getSafeRedirectUrl } from '@/lib/utils';

export async function signIn(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string || '';

  if (!email || !password) {
    return { error: 'Preencha o e-mail e a senha.' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return { error: 'E-mail ou senha incorretos.' };
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { error: 'E-mail ou senha incorretos.' };
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  const sessionToken = await createSessionToken({
    id: user.id,
    email: user.email,
    name: profile?.name || user.email.split('@')[0],
    role: user.role,
  });

  await setSessionCookie(sessionToken);

  revalidatePath('/', 'layout');

  const rawRedirect = formData.get('redirect') as string;
  const redirectUrl = getSafeRedirectUrl(rawRedirect, '/dashboard');
  redirect(redirectUrl);
}

export async function signUp(formData: FormData) {
  const fullName = (formData.get('full_name') as string || '').trim();
  const email = (formData.get('email') as string || '').trim().toLowerCase();
  const password = formData.get('password') as string || '';
  const passwordConfirm = formData.get('password_confirm') as string || '';

  if (!fullName) {
    return { error: 'Por favor, informe seu nome completo.' };
  }

  if (!email || !email.includes('@')) {
    return { error: 'Por favor, informe um e-mail válido.' };
  }

  if (password.length < 6) {
    return { error: 'A senha deve ter no mínimo 6 caracteres.' };
  }

  if (passwordConfirm && password !== passwordConfirm) {
    return { error: 'As senhas informadas não coincidem.' };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    return { error: 'Já existe uma conta com este e-mail. Faça login ou recupere sua senha.' };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [newUser] = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({
        email,
        passwordHash,
        role: 'user',
      })
      .returning();

    await tx.insert(profiles).values({
      id: createdUser.id,
      name: fullName,
      role: 'user',
    });

    return [createdUser];
  });

  const sessionToken = await createSessionToken({
    id: newUser.id,
    email: newUser.email,
    name: fullName,
    role: newUser.role,
  });

  await setSessionCookie(sessionToken);

  revalidatePath('/', 'layout');

  const rawRedirect = formData.get('redirect') as string;
  const redirectUrl = getSafeRedirectUrl(rawRedirect, '/dashboard');
  redirect(redirectUrl);
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string || '').trim().toLowerCase();

  if (!email) {
    return { error: 'Por favor, informe seu e-mail.' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora de validade

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    // Em produção com serviço SMTP, envia o e-mail.
    // Aqui geramos o link seguro para uso imediato
    console.log(`[AUTH] Link de recuperação para ${email}: /redefinir-senha?token=${rawToken}`);
  }

  return {
    success: true,
    message: 'Se houver uma conta vinculada a este e-mail, as instruções de recuperação foram geradas com sucesso.',
  };
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string || '';
  const passwordConfirm = formData.get('password_confirm') as string || '';

  if (password.length < 6) {
    return { error: 'A nova senha deve ter no mínimo 6 caracteres.' };
  }

  if (password !== passwordConfirm) {
    return { error: 'As senhas informadas não coincidem.' };
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const resetRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.tokenHash, tokenHash),
      isNull(passwordResetTokens.usedAt),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  if (!resetRecord) {
    return { error: 'Link de recuperação inválido ou expirado. Solicite uma nova recuperação.' };
  }

  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(password, salt);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id));
  });

  return { success: true, message: 'Senha atualizada com sucesso! Você já pode fazer login.' };
}

export async function signOut() {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/login');
}