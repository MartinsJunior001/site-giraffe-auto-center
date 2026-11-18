import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteName, siteUrl } from "@/content/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${siteName} | Marketing para oficinas e centros automotivos`,
  description: "Estratégia de marketing, captação e acompanhamento comercial para oficinas e centros automotivos. Solicite um diagnóstico.",
  ...(siteUrl ? {
    metadataBase: new URL(siteUrl),
    alternates: { canonical: "/" },
    // Imagem de compartilhamento (WhatsApp, redes sociais): a cena final do hero, recortada em 1200 × 630.
    openGraph: { title: siteName, description: "Marketing e estratégia para oficinas e centros automotivos.", url: siteUrl, siteName, type: "website" as const, locale: "pt_BR", images: [{ url: "/images/og/giraffe-assessoria-og.jpg", width: 1200, height: 630, alt: "Oficina cheia e organizada, com os boxes ocupados e clientes na recepção" }] },
    twitter: { card: "summary_large_image" as const, title: siteName, description: "Marketing e estratégia para oficinas e centros automotivos.", images: ["/images/og/giraffe-assessoria-og.jpg"] },
  } : {}),
  robots: { index: process.env.NEXT_PUBLIC_INDEXABLE === "true", follow: process.env.NEXT_PUBLIC_INDEXABLE === "true" },
  // Verificação de propriedade no Google Search Console (método "Tag HTML"). É um código público:
  // não remova, ou o Google perde a confirmação da propriedade.
  verification: { google: "rzqnwVt44byzdhQ2SOj2ec4JNYBGuaLXY9ifKtUbMGY" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable}`} data-scroll-behavior="smooth"><body>{children}</body></html>;
}
