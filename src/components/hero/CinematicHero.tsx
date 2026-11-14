"use client";

import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { UiIcon } from "@/components/icons/UiIcon";
import { heroCta, heroEyebrow, heroImages, heroScenes, heroUi, type HeroUi } from "@/content/hero";
import { HERO_INPUT, HERO_MOTION } from "./heroConfig";
import { HeroScene, type HeroSceneHandle } from "./HeroScene";
import { useStepGestures } from "./useStepGestures";
import "./cinematic-hero.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LAST = heroScenes.length - 1;
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia(REDUCED_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const readReducedMotion = () => window.matchMedia(REDUCED_QUERY).matches;

const plain = (text: string) => text.replaceAll("*", "");
const pad = (value: number) => String(value).padStart(2, "0");

/** "texto *destaque*" → texto <em>destaque</em> */
function Emphasis({ text }: { text: string }) {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, index) => (part.length > 2 && part.startsWith("*") && part.endsWith("*") ? <em key={index}>{part.slice(1, -1)}</em> : <Fragment key={index}>{part}</Fragment>));
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Cartões de interface de cada tipo de cena (só ilustração: escondidos de leitores de tela). */
function UiCards({ kind, step }: { kind: HeroUi; step: number }) {
  if (kind === "visibility") {
    return (
      <>
        <div className="ch-card ch-search" data-ui={step}>
          <span className="ch-card-label">{heroUi.search.label}</span>
          <span className="ch-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" focusable="false">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m20 20-4.6-4.6" />
            </svg>
            <span className="ch-search-query">{heroUi.search.query}</span>
            <span className="ch-caret" />
          </span>
          <span className="ch-search-result">
            <span className="ch-dot" />
            <strong>{heroUi.search.result}</strong>
            <small>{heroUi.search.meta}</small>
          </span>
        </div>
        <div className="ch-card ch-ad" data-ui={step}>
          <span className="ch-card-label">{heroUi.ad.label}</span>
          <strong>{heroUi.ad.title}</strong>
          <span className="ch-ad-action">{heroUi.ad.action}</span>
        </div>
      </>
    );
  }
  if (kind === "messages") {
    return (
      <div className="ch-card ch-messages" data-ui={step}>
        <span className="ch-card-label">{heroUi.messages.label}</span>
        <span className="ch-bubbles">
          {heroUi.messages.items.map((message) => (
            <span key={message} className="ch-bubble">
              {message}
            </span>
          ))}
        </span>
        <span className="ch-chip">{heroUi.messages.chip}</span>
      </div>
    );
  }
  if (kind === "schedule") {
    return (
      <div className="ch-card ch-agenda" data-ui={step}>
        <span className="ch-agenda-head">
          <strong>{heroUi.schedule.title}</strong>
          <span className="ch-card-label">{heroUi.schedule.label}</span>
        </span>
        {heroUi.schedule.items.map((item) => (
          <span key={item.time} className="ch-row">
            <time>{item.time}</time>
            <span>{item.service}</span>
            <span className="ch-check">
              <Check />
            </span>
          </span>
        ))}
      </div>
    );
  }
  return null;
}

const at = (point: { x: number; y: number }): CSSProperties => ({ left: `${point.x * 100}%`, top: `${point.y * 100}%` });

/** Entrada das interfaces de uma cena (cartões e elementos presos à imagem). */
function uiIn(q: (selector: string) => Element[], to: number) {
  const timeline = gsap.timeline();
  const kind = heroScenes[to].ui;
  const cards = q(`[data-ui="${to}"]`);
  const anchors = q(`[data-ui-anchor="${to}"]`);
  if (cards.length) timeline.fromTo(cards, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.16 }, 0);
  if (anchors.length) timeline.fromTo(anchors, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.18 }, 0.05);

  // Só anima o que existe na cena (evita avisos do GSAP com alvos vazios).
  const add = (selector: string, from: gsap.TweenVars, to_: gsap.TweenVars, position: number) => {
    const targets = q(selector);
    if (targets.length) timeline.fromTo(targets, from, to_, position);
  };
  if (kind === "visibility") {
    add(`[data-ui-anchor="${to}"] .ch-pin-drop`, { y: -28 }, { y: 0, duration: 0.7, ease: "back.out(1.8)" }, 0.05);
    add(`[data-ui="${to}"] .ch-search-query`, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.75, ease: "steps(26)" }, 0.3);
    add(`[data-ui="${to}"] .ch-search-result`, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 1.05);
  } else if (kind === "messages") {
    add(`[data-ui="${to}"] .ch-bubble`, { autoAlpha: 0, y: 10, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out", stagger: 0.22 }, 0.2);
    add(`[data-ui="${to}"] .ch-chip`, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, 0.95);
  } else if (kind === "schedule") {
    add(`[data-ui="${to}"] .ch-row`, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", stagger: 0.18 }, 0.2);
    add(`[data-ui="${to}"] .ch-check`, { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(2.4)", stagger: 0.18 }, 0.4);
    add(`[data-ui-anchor="${to}"] .ch-bay-chip`, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.18 }, 0.4);
  }
  return timeline;
}

/**
 * Hero cinematográfico: a mesma oficina, vista do alto, evolui em 5 estados (4 avanços).
 * Cada gesto de rolagem, deslize ou tecla avança ou volta uma etapa; no último estado,
 * a página volta a rolar normalmente. Com movimento reduzido, mostra só o estado final.
 */
export function CinematicHero() {
  const rootRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HeroSceneHandle>(null);
  const stepRef = useRef(0);
  const busyRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  // Criado dentro do useGSAP (contextSafe): as animações das trocas são limpas ao desmontar.
  const runRef = useRef<((from: number, to: number, durationMs: number, focusCta: boolean) => void) | null>(null);
  const [step, setStep] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => false);
  const active = reduced ? LAST : step;

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      if (!root || !contextSafe) return;
      const q = gsap.utils.selector(root);

      // Celular: o bloco de texto acompanha a altura do texto da etapa, então a linha laranja
      // fica sempre logo acima do título (no desktop o CSS não usa estas variáveis).
      const stack = q(".ch-copy-stack")[0] as HTMLElement | undefined;
      const fitCopy = (index: number, durationMs?: number) => {
        const block = q(`[data-copy="${index}"]`)[0] as HTMLElement | undefined;
        if (!stack || !block) return;
        if (durationMs) stack.style.setProperty("--ch-copy-ms", `${Math.round(durationMs * 0.8)}ms`);
        stack.style.setProperty("--ch-copy-h", `${block.offsetHeight}px`);
      };
      // Mede de novo quando o texto muda de tamanho (fonte carregada, giro da tela).
      const resizeObserver = new ResizeObserver(() => fitCopy(readReducedMotion() ? LAST : stepRef.current));
      q("[data-copy]").forEach((block) => resizeObserver.observe(block));

      // Monta a troca completa: texto sai, cena troca, texto e interface entram.
      runRef.current = contextSafe((from: number, to: number, durationMs: number, focusCta: boolean) => {
        const scene = sceneRef.current;
        if (!scene) {
          busyRef.current = false;
          return;
        }
        fitCopy(to, durationMs);
        const direction = to > from ? 1 : -1;
        const seconds = durationMs / 1000;
        const timeline = gsap.timeline({
          onComplete: () => {
            if (focusCta) (q("[data-hero-cta]")[0] as HTMLElement | undefined)?.focus({ preventScroll: true });
          },
        });
        const outgoingUi = q(`[data-ui="${from}"], [data-ui-anchor="${from}"]`);
        if (outgoingUi.length) timeline.to(outgoingUi, { autoAlpha: 0, y: -8, duration: seconds * 0.3, ease: "power2.in" }, 0);
        timeline
          .to(q(`[data-copy="${from}"]`), { autoAlpha: 0, y: -14 * direction, duration: seconds * 0.36, ease: "power2.in" }, 0)
          .add(scene.transition(from, to, durationMs), 0)
          .fromTo(q(`[data-copy="${to}"]`), { autoAlpha: 0, y: 16 * direction }, { autoAlpha: 1, y: 0, duration: seconds * 0.62, ease: "power3.out" }, seconds * 0.38)
          .fromTo(q(`[data-copy="${to}"] .ch-stagger`), { y: 8 * direction }, { y: 0, duration: seconds * 0.62, ease: "power3.out", stagger: 0.07 }, seconds * 0.38)
          .add(uiIn(q, to), seconds * 0.5)
          // A próxima etapa fica liberada ao fim da troca, mesmo que a interface ainda esteja entrando.
          .call(() => {
            busyRef.current = false;
          }, undefined, seconds);
        timelineRef.current = timeline;
      });

      // Quem sai do hero no meio da apresentação (link do menu, barra de rolagem, página
      // recarregada no meio) e volta encontra o estado final; dali, rolar para cima volta as etapas.
      const snapToLast = contextSafe(() => {
        if (stepRef.current === LAST || busyRef.current || readReducedMotion()) return;
        timelineRef.current?.kill();
        sceneRef.current?.set(LAST);
        gsap.set(q("[data-ui], [data-ui-anchor], [data-copy]"), { autoAlpha: 0 });
        gsap.set(q(`[data-copy="${LAST}"]`), { autoAlpha: 1, y: 0 });
        gsap.set(q(`[data-copy="${LAST}"] .ch-stagger`), { y: 0 });
        stepRef.current = LAST;
        fitCopy(LAST);
        setStep(LAST);
      });
      const leftHero = () => window.scrollY > window.innerHeight * 0.5;
      const onScroll = () => {
        if (leftHero()) snapToLast();
      };
      if (leftHero()) snapToLast();
      else sceneRef.current?.set(0);

      // Ao sair do hero rolando a página, a câmera continua se aproximando e o texto sobe.
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to(q(".ch-exit"), { scale: 1.08, yPercent: 6, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(q(".ch-front"), { yPercent: -14, opacity: 0.15, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
      });

      const onResize = () => {
        if (!busyRef.current) sceneRef.current?.set(stepRef.current);
      };
      window.addEventListener("resize", onResize);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        resizeObserver.disconnect();
        media.revert();
        runRef.current = null;
      };
    },
    { scope: rootRef },
  );

  const goTo = (target: number, durationMs: number = HERO_MOTION.transitionMs, focusCta = false) => {
    const from = stepRef.current;
    const to = Math.max(0, Math.min(LAST, target));
    const scene = sceneRef.current;
    if (reduced || !scene || to === from || busyRef.current) return;
    busyRef.current = true;
    // A troca anterior pode ainda estar terminando a interface: para onde está e segue dali.
    timelineRef.current?.kill();
    stepRef.current = to;
    setStep(to);
    setAnnouncement(`Etapa ${to} de ${LAST}, ${heroScenes[to].label}: ${plain(heroScenes[to].title)}`);
    scene.ready(to).then(() => {
      if (runRef.current) runRef.current(from, to, durationMs, focusCta);
      else busyRef.current = false;
    });
  };

  useStepGestures({
    enabled: !reduced,
    lastStep: LAST,
    getStep: () => stepRef.current,
    isBusy: () => busyRef.current,
    onStep: (direction) => goTo(stepRef.current + direction),
  });

  // Celular: impede o "puxar para atualizar" no topo enquanto o hero ainda pode voltar etapas.
  useEffect(() => {
    document.documentElement.classList.toggle("ch-lock", !reduced && step > 0 && window.scrollY <= HERO_INPUT.topTolerance);
  }, [step, reduced]);

  // Estado 4: enquanto o botão do hero estiver na tela, ele é o único botão laranja
  // (o do cabeçalho fica escuro, via classe "ch-final"); ao rolar a página, tudo volta ao normal.
  const [ctaInView, setCtaInView] = useState(true);
  useEffect(() => {
    const cta = rootRef.current?.querySelector("[data-hero-cta]");
    if (!cta) return;
    const observer = new IntersectionObserver(([entry]) => setCtaInView(entry.isIntersecting), { rootMargin: "-88px 0px 0px 0px" });
    observer.observe(cta);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("ch-final", active === LAST && ctaInView);
    return () => html.classList.remove("ch-final");
  }, [active, ctaInView]);

  const sceneLabel = heroImages[heroScenes[active].image].alt;

  return (
    <section
      id="inicio"
      ref={rootRef}
      className="ch"
      data-step={active}
      data-end={active === LAST || undefined}
      aria-labelledby="ch-title"
      style={{ "--ch-focus": heroScenes[0].mobileFocus } as CSSProperties}
    >
      <HeroScene ref={sceneRef} reduced={reduced} label={sceneLabel}>
        {heroScenes.map((scene, index) =>
          scene.ui === "visibility" ? (
            <span key={`pin-${index}`} className="ch-pin" data-ui-anchor={index} style={at(heroUi.anchors.pin)} aria-hidden="true">
              <span className="ch-pin-ring" />
              <span className="ch-pin-drop">
                <span className="ch-pin-icon" />
              </span>
            </span>
          ) : scene.ui === "schedule" ? (
            heroUi.anchors.bays.map((bay, bayIndex) => (
              <span key={`bay-${index}-${bayIndex}`} className="ch-bay" data-ui-anchor={index} style={at(bay)} aria-hidden="true">
                <span className="ch-bay-chip">{heroUi.schedule.items[bayIndex]?.time}</span>
              </span>
            ))
          ) : null,
        )}
      </HeroScene>
      <div className="ch-shade" aria-hidden="true" />

      <div className="ch-front">
        <div className="ch-ui" aria-hidden="true">
          {heroScenes.map((scene, index) =>
            scene.ui === "none" ? null : (
              <div key={index} className="ch-ui-step">
                <UiCards kind={scene.ui} step={index} />
              </div>
            ),
          )}
        </div>

        <div className="ch-copy">
          <h1 id="ch-title" className="ch-eyebrow">
            {heroEyebrow}
          </h1>
          <div className="ch-copy-stack">
            {heroScenes.map((scene, index) => {
              const isActive = index === active;
              return (
                <div key={index} className="ch-copy-block" data-copy={index} data-final={index === LAST || undefined} aria-hidden={!isActive} inert={!isActive}>
                  <h2 className="ch-title ch-stagger">
                    <Emphasis text={scene.title} />
                  </h2>
                  <p className="ch-text ch-stagger">{scene.text}</p>
                  {index === LAST ? (
                    <a className="button button-orange ch-cta ch-stagger" href={heroCta.href} data-cta="hero" data-hero-cta>
                      {heroCta.label} <UiIcon name="up-right" />
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="ch-bar">
          <nav className="ch-progress" aria-label="Etapas da apresentação">
            <ol>
              {heroScenes.slice(1).map((scene, offset) => {
                const index = offset + 1;
                return (
                  <li key={index}>
                    <button
                      type="button"
                      className={`ch-step${index === active ? " is-active" : ""}${index < active ? " is-done" : ""}`}
                      aria-label={`Etapa ${index} de ${LAST}: ${scene.label}`}
                      aria-current={index === active ? "step" : undefined}
                      onClick={() => goTo(index)}
                    >
                      <span aria-hidden="true">{pad(index)}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          {active < LAST ? (
            <button type="button" className="ch-skip" onClick={() => goTo(LAST, HERO_MOTION.skipMs, true)}>
              Pular introdução
            </button>
          ) : null}
        </div>

        <p className="ch-hint" aria-hidden="true">
          <span className="ch-mouse" />
          <span className="ch-hint-mouse">Role para ver a transformação</span>
          <span className="ch-hint-touch">Deslize para cima</span>
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
