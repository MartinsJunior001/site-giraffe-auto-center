"use client";

import Image from "next/image";
import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import gsap from "gsap";
import { heroImages, heroScenes } from "@/content/hero";
import { HERO_MOTION } from "./heroConfig";

/**
 * Contrato da cena. O hero só conversa com a cena por estes três métodos, então trocar
 * esta implementação (camadas de imagem) por outra (ex.: sequência de quadros num canvas)
 * não exige mexer no restante do componente.
 */
export type HeroSceneHandle = {
  /** Devolve a timeline da troca de `from` para `to`; o hero a encaixa na troca completa. */
  transition: (from: number, to: number, durationMs: number) => gsap.core.Timeline;
  /** Coloca a cena direto num estado, sem animação (montagem, redimensionamento). */
  set: (step: number) => void;
  /** Resolve quando a imagem do estado está pronta para aparecer (ou após um tempo-limite). */
  ready: (step: number) => Promise<void>;
};

type Props = {
  ref?: Ref<HeroSceneHandle>;
  /** Com movimento reduzido, a cena final é carregada logo e mostrada parada. */
  reduced: boolean;
  /** Descrição da cena visível, para leitores de tela. */
  label: string;
  /** Elementos presos à imagem (pino, marcadores), posicionados em % da imagem. */
  children?: ReactNode;
};

const LAST = heroScenes.length - 1;
const READY_TIMEOUT_MS = 2500;
// A imagem cobre a tela: 100% da largura em telas largas; 177% da altura em telas mais estreitas.
const SIZES = "(min-aspect-ratio: 2688/1520) 100vw, 177vh";

/**
 * Só a camada do estado atual fica desenhada. Enquanto a imagem dela não carregou,
 * as camadas de baixo continuam aparecendo por trás, como reserva.
 */
const isVisible = (loaded: Set<number>, layer: number, step: number) => layer === step || (layer < step && !loaded.has(step));

/** Mostra ou esconde sem animação; `visibility: hidden` poupa o navegador de desenhar a camada. */
const showLayer = (layer: HTMLElement, visible: boolean) => {
  layer.style.opacity = visible ? "1" : "0";
  layer.style.visibility = visible ? "inherit" : "hidden";
};

export function HeroScene({ ref, reduced, label, children }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<(HTMLDivElement | null)[]>([]);
  const stepRef = useRef(0);
  const transitioning = useRef(false);
  const loaded = useRef(new Set<number>());
  const loads = useRef(new Map<number, { promise: Promise<void>; resolve: () => void }>());
  // Camadas 0 e 1 usam a mesma imagem base (um único download). As demais entram em sequência.
  const [mountedUpTo, setMountedUpTo] = useState(1);
  // Movimento reduzido: só a base e a cena final (nada de baixar as cenas intermediárias).
  const shouldRender = (index: number) => (reduced ? index === 1 || index === LAST : index <= mountedUpTo);

  const loadEntry = (layer: number) => {
    let entry = loads.current.get(layer);
    if (!entry) {
      let resolve = () => {};
      const promise = new Promise<void>((done) => (resolve = done));
      entry = { promise, resolve };
      loads.current.set(layer, entry);
    }
    return entry;
  };

  const applyVisibility = (step: number) => {
    layersRef.current.forEach((layer, index) => {
      if (layer) showLayer(layer, isVisible(loaded.current, index, step));
    });
  };

  const handleLoad = (layer: number, image: HTMLImageElement) => {
    const finish = () => {
      loaded.current.add(layer);
      loadEntry(layer).resolve();
      // A imagem do estado atual chegou depois da troca: tira as camadas de reserva.
      if (layer === stepRef.current && !transitioning.current) applyVisibility(layer);
      // Carregamento progressivo: só pede a próxima imagem depois que esta terminou.
      if (layer >= 1 && layer < LAST) {
        const next = () => setMountedUpTo((current) => Math.max(current, layer + 1));
        if ("requestIdleCallback" in window) window.requestIdleCallback(next, { timeout: 1200 });
        else setTimeout(next, 200);
      }
    };
    image.decode().then(finish, finish);
  };

  // Zoom da câmera no estado (nunca menor que 1, para a imagem sempre cobrir a tela).
  const scaleFor = (step: number) => {
    const zoom = HERO_MOTION.cameraZoom;
    return Math.max(1, zoom[Math.min(Math.max(step, 0), zoom.length - 1)] ?? 1);
  };

  // No celular (tela em pé) a câmera desliza para manter o foco de cada estado no centro.
  const panFor = (step: number, scale: number) => {
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return 0;
    const viewWidth = stage.clientWidth;
    if (viewWidth / stage.clientHeight >= 1) return 0;
    const boxWidth = frame.offsetWidth * scale;
    const limit = Math.max(0, (boxWidth - viewWidth) / 2);
    return gsap.utils.clamp(-limit, limit, (0.5 - heroScenes[step].mobileFocus) * boxWidth);
  };

  // Registra cada camada uma única vez. Camada que entra depois nasce com a visibilidade do
  // estado atual (não pode ser reaplicada a cada renderização, ou atrapalharia um fade em curso).
  const seen = useRef(new WeakSet<HTMLDivElement>());
  const registerLayer = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const index = Number(element.dataset.layer);
    layersRef.current[index] = element;
    if (seen.current.has(element)) return;
    seen.current.add(element);
    showLayer(element, isVisible(loaded.current, index, stepRef.current));
  }, []);

  useImperativeHandle(ref, () => ({
    set(step) {
      stepRef.current = step;
      setMountedUpTo((current) => Math.max(current, step));
      applyVisibility(step);
      const scale = scaleFor(step);
      gsap.set(cameraRef.current, { scale, x: panFor(step, scale) });
    },

    transition(from, to, durationMs) {
      const duration = durationMs / 1000;
      const layers = layersRef.current;
      const timeline = gsap.timeline({ defaults: { ease: HERO_MOTION.ease } });
      stepRef.current = to;
      transitioning.current = true;

      if (to > from) {
        // A nova cena surge por cima da atual (cross-fade sem escurecer no meio).
        const target = layers[to];
        if (target) timeline.fromTo(target, { autoAlpha: 0 }, { autoAlpha: 1, duration }, 0);
      } else {
        // A cena de destino é posta por baixo e a atual some, revelando-a.
        layers.forEach((layer, index) => {
          if (layer && index !== from) showLayer(layer, isVisible(loaded.current, index, to));
        });
        const top = layers[from];
        if (top) timeline.to(top, { autoAlpha: 0, duration }, 0);
      }
      // No fim, só a cena atual continua desenhada.
      timeline.call(
        () => {
          transitioning.current = false;
          applyVisibility(to);
        },
        undefined,
        duration,
      );

      // Câmera: aproxima um pouco a cada etapa (e desliza no celular), um pouco mais lenta que o fade.
      const scale = scaleFor(to);
      timeline.to(cameraRef.current, { scale, x: panFor(to, scale), duration: duration * 1.15 }, 0);
      return timeline;
    },

    ready(step) {
      const layer = Math.max(0, Math.min(LAST, step));
      setMountedUpTo((current) => Math.max(current, layer));
      const timeout = new Promise<void>((done) => setTimeout(done, READY_TIMEOUT_MS));
      return Promise.race([loadEntry(layer).promise, timeout]);
    },
  }));

  return (
    <div className="ch-stage" ref={stageRef} role="img" aria-label={label}>
      <div className="ch-exit">
        <div className="ch-frame" ref={frameRef}>
          <div className="ch-camera" ref={cameraRef}>
            {heroScenes.map((scene, index) => {
              if (!shouldRender(index)) return null;
              const image = heroImages[scene.image];
              const first = index === 0;
              return (
                <div key={index} className={`ch-layer${first ? " ch-layer-cool" : ""}`} data-layer={index} data-final={index === LAST || undefined} ref={registerLayer}>
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes={SIZES}
                    loading="eager"
                    fetchPriority={first ? "high" : index === 1 ? "auto" : "low"}
                    onLoad={(event) => handleLoad(index, event.currentTarget)}
                  />
                </div>
              );
            })}
            <div className="ch-anchors">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
