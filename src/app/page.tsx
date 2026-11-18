import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TrustedBy, About, PainPoints, Benefits, CaseStudies, Solutions, WhyGiraffe, FAQ } from "@/components/sections/Sections";
import { Diagnosis } from "@/components/sections/Diagnosis";
import { CinematicHero } from "@/components/hero/CinematicHero";
import { siteName, siteUrl } from "@/content/site";
import { privacyPolicy } from "@/content/privacy";
import { whatsappNumber } from "@/content/diagnosis";

// Dados estruturados da empresa (schema.org/Organization), só com dados reais já publicados no site
// (razão social, CNPJ e e-mail da política de privacidade; WhatsApp do botão de contato). Sem avaliações nem notas.
// Só entram quando a URL pública do site está configurada (NEXT_PUBLIC_SITE_URL).
const organization = siteUrl ? {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  legalName: privacyPolicy.legalName,
  taxID: privacyPolicy.cnpj,
  url: siteUrl,
  logo: `${siteUrl}/images/logos/logo-giraffe-assessoria-preta.png`,
  description: "Estratégia de marketing, captação e acompanhamento comercial para oficinas e centros automotivos.",
  email: privacyPolicy.contactEmail,
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    ...(whatsappNumber ? { telephone: `+${whatsappNumber}` } : {}),
    email: privacyPolicy.contactEmail,
    areaServed: "BR",
    availableLanguage: "pt-BR",
  },
} : null;

export default function Home() {
  return <>
    {organization ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} /> : null}
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo"><CinematicHero /><PainPoints /><TrustedBy /><About /><CaseStudies /><Benefits /><Solutions /><WhyGiraffe /><FAQ /><Diagnosis /></main><Footer />
  </>;
}
