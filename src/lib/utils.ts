import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * Sanitiza URLs de redirecionamento para prevenir vulnerabilidades de Open Redirect.
 * Permite apenas caminhos relativos internos (começando com '/', mas não '//').
 */
export function getSafeRedirectUrl(targetUrl: string | null | undefined, defaultUrl: string = '/dashboard'): string {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return defaultUrl;
  }

  const trimmed = targetUrl.trim();

  // Bloqueia esquemas como javascript:, data:, http:, https:, etc.
  // Bloqueia URLs que começam com '//' (que o browser interpreta como protocol-relative)
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return defaultUrl;
  }

  return trimmed;
}