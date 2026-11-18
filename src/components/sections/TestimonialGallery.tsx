"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { testimonials, type Testimonial } from "@/content/testimonials";
import { UiIcon } from "@/components/icons/UiIcon";

// Tempo parado em cada posição antes de o carrossel passar para o próximo depoimento.
const AUTOPLAY_MS = 5000;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const pad = (value: number) => String(value).padStart(2, "0");

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
      {testimonial.posterSrc ? <Image src={testimonial.posterSrc} alt="" fill sizes="(max-width: 760px) 78vw, (max-width: 1279px) 300px, (max-width: 1799px) 25vw, 20vw" /> : null}
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

// Cards que aparecem por inteiro (ao menos 60% da largura) na faixa visível do carrossel.
function visibleRange(gallery: HTMLElement) {
  const box = gallery.getBoundingClientRect();
  const cards = [...gallery.children] as HTMLElement[];
  let first = -1;
  let last = -1;
  cards.forEach((card, index) => {
    const rect = card.getBoundingClientRect();
    const shown = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
    if (shown >= rect.width * 0.6) { if (first < 0) first = index; last = index; }
  });
  return first < 0 ? { first: 0, last: 0 } : { first, last };
}

// Rola só o carrossel (nunca a página) até o card ficar na primeira posição.
function scrollToCard(gallery: HTMLElement, index: number) {
  const cards = [...gallery.children] as HTMLElement[];
  if (!cards[index]) return;
  const max = gallery.scrollWidth - gallery.clientWidth;
  const left = Math.min(max, Math.max(0, cards[index].offsetLeft - cards[0].offsetLeft));
  gallery.scrollTo({ left, behavior: window.matchMedia(REDUCED_QUERY).matches ? "auto" : "smooth" });
}

export function TestimonialGallery() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const previousOverflow = useRef("");
  const [active, setActive] = useState<Testimonial | null>(null);
  const [{ first, last }, setRange] = useState({ first: 0, last: 0 });
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);

  // Acompanha quais depoimentos estão na tela, para acender os indicadores certos.
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = visibleRange(gallery);
        setRange(current => current.first === next.first && current.last === next.last ? current : next);
      });
    };
    update();
    gallery.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); gallery.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  // A rotação só corre com o carrossel na tela.
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !("IntersectionObserver" in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  // Passa para o próximo depoimento a cada AUTOPLAY_MS; no fim, volta ao primeiro. Para com o mouse
  // em cima, com o foco num card, com o vídeo aberto, com a aba em segundo plano e com movimento reduzido.
  // Qualquer rolagem (o visitante arrastando, ou o próprio avanço) recomeça a contagem.
  const playing = inView && !hovering && !focused && !active;
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || !playing || window.matchMedia(REDUCED_QUERY).matches) return;
    let timer = 0;
    const schedule = () => { window.clearTimeout(timer); timer = window.setTimeout(advance, AUTOPLAY_MS); };
    function advance() {
      if (gallery && !document.hidden) {
        const atEnd = gallery.scrollLeft >= gallery.scrollWidth - gallery.clientWidth - 2;
        scrollToCard(gallery, atEnd ? 0 : visibleRange(gallery).first + 1);
      }
      schedule();
    }
    gallery.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => { window.clearTimeout(timer); gallery.removeEventListener("scroll", schedule); };
  }, [playing]);

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
    <div className="testimonial-carousel" onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovering(true); }} onPointerLeave={() => setHovering(false)}>
    <div
      ref={galleryRef}
      className="testimonial-gallery"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Depoimentos em vídeo"
      tabIndex={0}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!galleryRef.current?.contains(event.relatedTarget as Node)) setFocused(false); }}
    >
      {testimonials.map((testimonial) => testimonial.youtubeId ? (
        // O nome acessível vem do próprio conteúdo (nome, empresa e frase visíveis), com o aviso do vídeo só para
        // leitores de tela: quem usa comando de voz pode acionar o card falando o que está escrito nele.
        <button key={testimonial.id} className="testimonial-card testimonial-card-ready" type="button" onClick={(event) => openVideo(testimonial, event.currentTarget)}>
          <span className="sr-only">Assistir depoimento em vídeo:</span>
          <CardContent testimonial={testimonial} />
        </button>
      ) : (
        <article key={testimonial.id} className="testimonial-card testimonial-card-pending" aria-label={`Espaço reservado: ${testimonial.title.toLowerCase()}, ${testimonial.company.toLowerCase()}`}>
          <CardContent testimonial={testimonial} />
        </article>
      ))}
    </div>
    {/* Indicadores no mesmo desenho das etapas do hero: um por depoimento; os que estão na tela ficam laranja. */}
    <nav className="testimonial-dots" aria-label="Escolher depoimento">
      <ol>
        {testimonials.map((testimonial, index) => (
          <li key={testimonial.id}>
            <button
              type="button"
              className={`testimonial-dot${index >= first && index <= last ? " is-active" : ""}`}
              aria-label={`${pad(index + 1)}, depoimento ${index + 1} de ${testimonials.length}: ${testimonial.name ?? testimonial.title}, ${testimonial.company}`}
              aria-current={index === first ? "true" : undefined}
              onClick={() => { if (galleryRef.current) scrollToCard(galleryRef.current, index); }}
            >
              <span aria-hidden="true">{pad(index + 1)}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
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
