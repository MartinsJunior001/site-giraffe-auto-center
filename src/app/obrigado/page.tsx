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
  return <main className="thanks">
    <div className="container thanks-inner">
      <Link className="thanks-brand" href="/" aria-label={`${siteName}, voltar à página inicial`}><Image src="/images/logos/logo-giraffe-assessoria-branca.svg" alt="" width={160} height={59} unoptimized priority /></Link>
      <p className="thanks-badge"><span aria-hidden="true"></span>Solicitação confirmada</p>
      <h1>Assista ao vídeo antes de <em>falar com o especialista</em></h1>
      <p className="thanks-lead">Em poucos minutos você entende como funciona o seu diagnóstico e o que acontece a partir de agora.</p>
      {thankYouVideo.src
        ? <ThankYouVideo src={thankYouVideo.src} poster={thankYouVideo.poster} vertical={thankYouVideo.vertical} redirectTo={cta.href} />
        : <div className="thanks-video thanks-video-placeholder" role="img" aria-label="Espaço reservado para o vídeo de boas-vindas"><Image src="/images/logos/logo g icone giraffe.svg" alt="" width={72} height={72} unoptimized /><span>Vídeo de boas-vindas em breve</span></div>}
      <a className="button button-orange thanks-cta" href={cta.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{cta.label} <UiIcon name="right" /></a>
      <p className="thanks-note">{thankYouVideo.src ? <>Quando o vídeo terminar, você vai para {cta.destination} automaticamente.<br />Se preferir, use o botão acima.</> : <>Um especialista da Giraffe vai falar com você pelo WhatsApp ou e-mail informados.</>}</p>
    </div>
  </main>;
}
