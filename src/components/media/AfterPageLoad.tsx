"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// Segura as imagens abaixo da dobra (logos do carrossel, fotos dos cards) até a imagem principal do hero
// estar pintada, para que elas não disputem rede nem processamento com o que aparece primeiro.
// O espaço de cada imagem é reservado no CSS: nada se move quando ela entra.
//
// Ordem de liberação (a primeira que acontecer vale para a página toda):
// 1. A pessoa interage (rola, toca, usa o teclado): libera na hora, antes mesmo do "load".
// 2. Depois do "load", o navegador avisa que pintou a imagem do LCP: libera quando ficar ocioso.
// 3. Navegador sem esse aviso (Safari antigo): dois quadros depois do "load" e então ocioso.
// 4. Rede de segurança: se nada disso acontecer (aba em segundo plano, imagem do hero com erro),
//    libera um pouco depois do "load", para as imagens nunca ficarem presas.

const INTERACTIONS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;
/** Limite da espera por ociosidade: com a página ocupada, libera mesmo assim depois disso. */
const IDLE_LIMIT_MS = 1000;
/** Rede de segurança depois do "load" (caso 4). No caminho normal a liberação vem bem antes. */
const SAFETY_NET_MS = 3000;

let released = false;
let started = false;
const listeners = new Set<() => void>();

function release() {
  if (released) return;
  released = true;
  for (const type of INTERACTIONS) window.removeEventListener(type, release, true);
  for (const listener of listeners) listener();
}

function whenIdle(run: () => void) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: IDLE_LIMIT_MS });
  else setTimeout(run, 0);
}

function afterLoad() {
  setTimeout(release, SAFETY_NET_MS);
  const reportsLcp = typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint");
  if (!reportsLcp) {
    requestAnimationFrame(() => requestAnimationFrame(() => whenIdle(release)));
    return;
  }
  // `buffered` entrega também o que já foi pintado antes do "load" (o caso mais comum em navegador real).
  const observer = new PerformanceObserver((list) => {
    const heroPainted = list.getEntries().some((entry) => Boolean((entry as PerformanceEntry & { url?: string }).url));
    if (!heroPainted) return;
    observer.disconnect();
    whenIdle(release);
  });
  observer.observe({ type: "largest-contentful-paint", buffered: true });
}

function start() {
  if (started) return;
  started = true;
  for (const type of INTERACTIONS) window.addEventListener(type, release, { capture: true, passive: true });
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
}

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  start();
  return () => {
    listeners.delete(onChange);
  };
};
const releasedOnClient = () => released;
const heldOnServer = () => false;

export function AfterPageLoad({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, releasedOnClient, heldOnServer);
  return ready ? children : null;
}
