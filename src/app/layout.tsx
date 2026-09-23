import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://propatchbr.com'),
  title: "Pro Patch BR | O Melhor Patch de Winning Eleven 10 (PS2 / OPL)",
  description: "Atualizações completas para PlayStation 2. Brasileirão Séries A, B e C, narração de Fernando Fefux (ESPN), transferências do mercado da bola e liberação imediata via PIX.",
  keywords: ["Winning Eleven 10", "PS2", "OPL", "Patch PS2", "Brasileirão", "Fernando Fefux", "Pro Patch BR"],
  authors: [{ name: "Pro Patch BR" }],
  openGraph: {
    title: "Pro Patch BR | O Melhor Patch de Winning Eleven 10 (PS2 / OPL)",
    description: "Nosso patch, sua diversão. Jogue no seu PlayStation 2 com elencos 100% atualizados e narração exclusiva.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/capa-we10.png", width: 800, height: 600, alt: "Pro Patch BR - Winning Eleven 10 PS2" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
