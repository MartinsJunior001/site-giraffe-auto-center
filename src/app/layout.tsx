import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteName, siteUrl } from "@/content/site";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${siteName} | Marketing para oficinas e centros automotivos`,
  description: "Estratégia de marketing, captação e acompanhamento comercial para oficinas e centros automotivos. Solicite um diagnóstico.",
  ...(siteUrl ? { metadataBase: new URL(siteUrl), alternates: { canonical: "/" }, openGraph: { title: siteName, description: "Marketing e estratégia para oficinas e centros automotivos.", url: siteUrl, type: "website" as const, locale: "pt_BR" } } : {}),
  robots: { index: process.env.NEXT_PUBLIC_INDEXABLE === "true", follow: process.env.NEXT_PUBLIC_INDEXABLE === "true" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable}`}><body>{children}</body></html>;
}
