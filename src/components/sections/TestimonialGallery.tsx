"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { testimonials, type Testimonial } from "@/content/testimonials";
import { UiIcon } from "@/components/icons/UiIcon";

const STAR_PATH = "m12 2.6 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9L12 2.6Z";

// Player oficial do YouTube no modo de privacidade aprimorada (youtube-nocookie.com). Ele só é criado
// depois do clique no card, então a reprodução começa sozinha, mas nunca ao carregar a página.
// playsinline mantém o vídeo dentro do site no iPhone; rel=0 limita as sugestões ao próprio canal.
// Às vezes o YouTube liga a legenda automática por cima da legenda gravada nos vídeos; nenhum parâmetro
// da incorporação controla isso de forma confiável. Para evitar, desative a legenda automática dos Shorts
// no YouTube Studio (o visitante também pode desligá-la no botão CC do player).
function youtubeEmbedUrl(id: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1&rel=0`;
}

function Stars({ rating }: { rating: number }) {
  return <span className="testimonial-stars" role="img" aria-label={`Avaliação: ${rating} de 5 estrelas`}>
    {Array.from({ length: 5 }, (_, index) => (
      <svg key={index} className={index < rating ? "is-filled" : ""} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={STAR_PATH} /></svg>
    ))}
  </span>;
}

function CardContent({ testimonial }: { testimonial: Testimonial }) {
  return <>
    <span className="testimonial-media">
      {testimonial.posterSrc ? <Image src={testimonial.posterSrc} alt="" fill sizes="(max-width: 760px) 78vw, (max-width: 1279px) 300px, 19vw" /> : null}
      {testimonial.youtubeId ? <span className="testimonial-play" aria-hidden="true"><UiIcon name="play" /></span> : null}
    </span>
    <span className="testimonial-caption">
      <span className="testimonial-avatar">{testimonial.avatarSrc ? <Image src={testimonial.avatarSrc} alt="" fill sizes="56px" /> : null}</span>
      {testimonial.rating ? <Stars rating={testimonial.rating} /> : null}
      <strong className="testimonial-name">{testimonial.name ?? testimonial.title}</strong>
      <span className="testimonial-company">{testimonial.company}</span>
      {testimonial.quote ? <span className="testimonial-quote" id={`${testimonial.id}-quote`}>“{testimonial.quote}”</span> : null}
    </span>
  </>;
}

// Trava/destrava a rolagem da página enquanto o vídeo está aberto (fora do componente,
// como pede o React Compiler para alterações em objetos globais).
function setPageScroll(overflow: string) {
  document.body.style.overflow = overflow;
}

export function TestimonialGallery() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const previousOverflow = useRef("");
  const [active, setActive] = useState<Testimonial | null>(null);

  useEffect(() => () => {
    if (dialogRef.current?.open) setPageScroll(previousOverflow.current);
  }, []);

  function openVideo(testimonial: Testimonial, opener: HTMLButtonElement) {
    openerRef.current = opener;
    previousOverflow.current = document.body.style.overflow;
    setPageScroll("hidden");
    setActive(testimonial);
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }

  function closeVideo() {
    dialogRef.current?.close();
  }

  // Ao fechar, o player sai da página (o vídeo para) e o foco volta para o card.
  function handleClose() {
    setPageScroll(previousOverflow.current);
    setActive(null);
    openerRef.current?.focus();
  }

  return <>
    <div className="testimonial-gallery" role="region" aria-label="Depoimentos em vídeo" tabIndex={0}>
      {testimonials.map((testimonial) => testimonial.youtubeId ? (
        <button key={testimonial.id} className="testimonial-card testimonial-card-ready" type="button" onClick={(event) => openVideo(testimonial, event.currentTarget)} aria-label={testimonial.name ? `Assistir depoimento em vídeo de ${testimonial.name}, ${testimonial.company}` : `Assistir ${testimonial.title.toLowerCase()} da ${testimonial.company}`} aria-describedby={testimonial.quote ? `${testimonial.id}-quote` : undefined}>
          <CardContent testimonial={testimonial} />
        </button>
      ) : (
        <article key={testimonial.id} className="testimonial-card testimonial-card-pending" aria-label={`Espaço reservado: ${testimonial.title.toLowerCase()}, ${testimonial.company.toLowerCase()}`}>
          <CardContent testimonial={testimonial} />
        </article>
      ))}
    </div>
    <dialog ref={dialogRef} className="testimonial-dialog" aria-label="Depoimento em vídeo" onClose={handleClose} onClick={(event) => { if (event.target === event.currentTarget) closeVideo(); }}>
      <div className="testimonial-dialog-content">
        <button className="testimonial-dialog-close" type="button" onClick={closeVideo} aria-label="Fechar vídeo"><UiIcon name="close" /></button>
        {active?.youtubeId ? <>
          {/* A capa fica por baixo enquanto o player carrega; a moldura 9:16 tem tamanho fixo (sem saltos no layout). */}
          <div className="testimonial-player">
            {active.posterSrc ? <Image src={active.posterSrc} alt="" fill sizes="420px" /> : null}
            <iframe
              key={active.id}
              src={youtubeEmbedUrl(active.youtubeId)}
              title={`Depoimento em vídeo de ${active.name ?? active.title}, ${active.company}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p><strong>{active.name ?? active.title}</strong> <em>{active.company}</em></p>
        </> : null}
      </div>
    </dialog>
  </>;
}
