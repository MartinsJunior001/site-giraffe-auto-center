import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { UiIcon } from "@/components/icons/UiIcon";
import { ThankYouVideo } from "@/components/sections/ThankYouVideo";
import { siteName } from "@/content/site";
import { thankYouCta, thankYouVideo } from "@/content/diagnosis";

export const metadata: Metadata = {
  title: `Obrigado | ${siteName}`,
  description: "Recebemos sua solicitação de diagnóstico. Um especialista da Giraffe vai entrar em contato.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  const cta = thankYouCta();
  const external = cta.href.startsWith("https://wa.me/");
  // Sem vídeo de boas-vindas (src vazio em src/content/diagnosis.ts), a página só confirma o pedido e oferece o WhatsApp.
  const hasVideo = Boolean(thankYouVideo.src);
  return <main className="thanks">
    <div className={`container thanks-inner${hasVideo ? "" : " thanks-inner-compact"}`}>
      <Link className="thanks-brand" href="/" aria-label={`${siteName}, voltar à página inicial`}><Image src="/images/logos/logo-giraffe-assessoria-branca.svg" alt="" width={160} height={59} unoptimized priority /></Link>
      <p className="thanks-badge"><span aria-hidden="true"></span>Solicitação confirmada</p>
      {hasVideo ? <>
        <h1>Assista ao vídeo antes de <em>falar com o especialista</em></h1>
        <p className="thanks-lead">Em poucos minutos você entende como funciona o seu diagnóstico e o que acontece a partir de agora.</p>
        <ThankYouVideo src={thankYouVideo.src} poster={thankYouVideo.poster} vertical={thankYouVideo.vertical} redirectTo={cta.href} />
      </> : <>
        <h1>Recebemos sua solicitação de <em>diagnóstico</em></h1>
        <p className="thanks-lead">Um especialista da Giraffe vai analisar as informações enviadas e falar com você pelo WhatsApp ou e-mail informados.</p>
      </>}
      <a className="button button-orange thanks-cta" href={cta.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{cta.label} <UiIcon name="right" /></a>
      {hasVideo
        ? <p className="thanks-note">Quando o vídeo terminar, você vai para {cta.destination} automaticamente.<br />Se preferir, use o botão acima.</p>
        : external ? <p className="thanks-note">Se preferir, adiante a conversa agora mesmo pelo WhatsApp.</p> : null}
    </div>
  </main>;
}
