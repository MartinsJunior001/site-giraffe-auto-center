"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { GLOBE } from "./globeConfig";
import type { GlobeController, GlobeTopology } from "./globeRenderer";
import "./brazil-globe.css";

// Globo interativo da seção "O que é a Giraffe" (coluna da direita), solto sobre o fundo da seção.
// Fica centralizado no Brasil e só se move quando a pessoa o arrasta; depois volta sozinho.
// Até o globo carregar, e se o JavaScript ou o canvas falharem, aparece a imagem estática do próprio globo.
export function BrazilGlobe() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const pulseRef = useRef<HTMLSpanElement>(null);
  const globeRef = useRef<GlobeController | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const tooltip = tipRef.current;
    const pulse = pulseRef.current;
    if (!root || !canvas || !tooltip || !pulse) return;
    let cancelled = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => globeRef.current?.setReducedMotion(motion.matches);

    // Biblioteca, desenho e dados só são baixados quando a seção se aproxima da tela.
    const start = async () => {
      try {
        const [{ createGlobe }, topology] = await Promise.all([
          import("./globeRenderer"),
          fetch(GLOBE.dataUrl).then((response) => {
            if (!response.ok) throw new Error(`Dados do globo: ${response.status}`);
            return response.json() as Promise<GlobeTopology>;
          }),
        ]);
        if (cancelled) return;
        const orange = getComputedStyle(document.documentElement).getPropertyValue("--orange").trim() || "#ff6400";
        globeRef.current = createGlobe({ canvas, tooltip, pulse, topology, orange, reducedMotion: motion.matches, onFirstFrame: () => setReady(true) });
        motion.addEventListener("change", onMotionChange);
      } catch {
        // Sem canvas ou sem dados: a imagem estática continua no lugar.
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void start();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(root);

    return () => {
      cancelled = true;
      observer.disconnect();
      motion.removeEventListener("change", onMotionChange);
      globeRef.current?.destroy();
      globeRef.current = null;
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const globe = globeRef.current;
    if (!globe) return;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => globe.rotateBy(-12, 0),
      ArrowRight: () => globe.rotateBy(12, 0),
      ArrowUp: () => globe.rotateBy(0, 8),
      ArrowDown: () => globe.rotateBy(0, -8),
      "+": () => globe.zoomBy(1.15),
      "=": () => globe.zoomBy(1.15),
      "-": () => globe.zoomBy(1 / 1.15),
      Home: () => globe.reset(),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };

  return (
    <div
      ref={rootRef}
      className={`brazil-globe${ready ? " is-ready" : ""}`}
      role="region"
      aria-roledescription="globo interativo"
      aria-label="Globo centralizado no Brasil, com pontos ilustrativos de atendimento em várias regiões. Arraste para girar; com o cursor sobre o globo, role para aproximar ou afastar. Depois, o globo volta sozinho ao Brasil. Pelo teclado, use as setas para girar, + ou − para o zoom e Home para voltar ao Brasil."
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <Image className="brazil-globe-fallback" src="/images/sobre/globo-brasil.webp" alt="" fill sizes="(max-width: 900px) 92vw, 45vw" />
      <canvas ref={canvasRef} className="brazil-globe-canvas" aria-hidden="true" />
      <span ref={pulseRef} className="brazil-globe-pulse" aria-hidden="true" />
      <span ref={tipRef} className="brazil-globe-tip" aria-hidden="true">
        {GLOBE.tooltip}
      </span>
    </div>
  );
}
