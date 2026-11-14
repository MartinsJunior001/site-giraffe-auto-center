"use client";

import { useEffect, useEffectEvent } from "react";
import { HERO_INPUT } from "./heroConfig";

type Direction = 1 | -1;

/** Um gesto de roda ou trackpad: eventos seguidos, sem pausa maior que `gestureGapMs`. */
type Gesture = {
  /** Momento do último evento. */
  last: number;
  startedAtTop: boolean;
  /** Deslocamento somado, comparado com o limite de avanço. */
  sum: number;
  /** Já trocou de etapa: o restante do gesto (inclusive a inércia) não troca de novo. */
  done: boolean;
  /** Começou durante uma troca: é ignorado. */
  blocked: boolean;
  /** Sentido (1 ou -1) e intensidade do último evento. */
  sign: number;
  prev: number;
  /** Maior intensidade desde o último impulso e a menor depois dela. */
  peak: number;
  low: number;
  /** Eventos seguidos com intensidade crescendo. */
  rises: number;
};

type Options = {
  /** Desligado com movimento reduzido: a página rola normalmente. */
  enabled: boolean;
  lastStep: number;
  getStep: () => number;
  /** Verdadeiro enquanto uma troca de etapa está acontecendo. */
  isBusy: () => boolean;
  onStep: (direction: Direction) => void;
};

/**
 * Converte rolagem (roda, trackpad), deslize e teclado em avanços de etapa.
 *
 * Regras:
 * - Só age com a página no topo e para gestos que começaram no topo.
 * - Um gesto troca no máximo uma etapa: o restante dele (inclusive a inércia do trackpad)
 *   é ignorado até uma pausa de `gestureGapMs`. Gestos iniciados durante uma troca também.
 * - Trackpad: depois que a troca termina, um gesto novo feito durante a inércia do anterior
 *   conta, porque volta a acelerar (a inércia só desacelera) ou muda de sentido.
 * - Na última etapa, rolar para baixo não é interceptado: a página volta a rolar normalmente.
 *   Rolar para cima no topo volta uma etapa.
 */
export function useStepGestures({ enabled, lastStep, getStep, isBusy, onStep }: Options) {
  const wants = useEffectEvent((direction: Direction) => {
    const step = getStep();
    return direction > 0 ? step < lastStep : step > 0;
  });
  const busy = useEffectEvent(() => isBusy());
  const step = useEffectEvent((direction: Direction) => onStep(direction));
  const currentStep = useEffectEvent(() => getStep());

  useEffect(() => {
    if (!enabled) return;
    const { wheelThreshold, swipeThreshold, gestureGapMs, topTolerance, newGestureDecay, newGestureRise, newGestureMinPx } = HERO_INPUT;
    const root = document.documentElement;
    const atTop = () => window.scrollY <= topTolerance;
    const dialogOpen = () => document.querySelector("dialog[open]") !== null;

    // Bloqueia o "puxar para atualizar" do celular enquanto o hero pode voltar etapas no topo.
    const syncOverscroll = () => root.classList.toggle("ch-lock", atTop() && currentStep() > 0);

    // ---- Roda do mouse e trackpad ----
    const startGesture = (now: number, abs: number, sign: number, blocked: boolean): Gesture => ({
      last: now,
      startedAtTop: atTop(),
      sum: 0,
      done: false,
      blocked,
      sign,
      prev: abs,
      peak: abs,
      low: abs,
      rises: 0,
    });
    let gesture = startGesture(-Infinity, 0, 1, false);
    const normalize = (event: WheelEvent, delta: number) => (event.deltaMode === 1 ? delta * 16 : event.deltaMode === 2 ? delta * window.innerHeight : delta);

    // Impulso novo dentro do mesmo fluxo de eventos: muda de sentido, ou volta a acelerar com
    // clareza depois de a inércia ter caído (dois eventos crescendo, bem acima do ponto mais baixo).
    // A inércia de um gesto só desacelera; rolagem constante (roda do mouse) também não acelera.
    const isNewImpulse = (abs: number, sign: number) =>
      (sign !== gesture.sign && abs >= newGestureMinPx) ||
      (gesture.rises >= 2 && gesture.low <= gesture.peak * newGestureDecay && abs >= Math.max(newGestureMinPx, gesture.low * newGestureRise));

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || dialogOpen()) return; // ctrl + roda é zoom da página
      const dy = normalize(event, event.deltaY);
      const dx = normalize(event, event.deltaX);
      if (Math.abs(dy) <= Math.abs(dx)) return; // gesto horizontal

      const abs = Math.abs(dy);
      const sign = dy > 0 ? 1 : -1;
      const now = performance.now();
      if (now - gesture.last > gestureGapMs) {
        gesture = startGesture(now, abs, sign, busy());
      } else {
        // Acompanha o formato do gesto: subidas seguidas, pico e o ponto mais baixo depois dele.
        gesture.rises = abs > gesture.prev ? gesture.rises + 1 : 0;
        if (abs >= gesture.peak) {
          gesture.peak = abs;
          gesture.low = abs;
        } else {
          gesture.low = Math.min(gesture.low, abs);
        }
        // Vale para gestos que já trocaram, que foram ignorados ou que começaram fora do topo
        // (ex.: a inércia que trouxe a página de volta ao topo não troca; um gesto novo, sim).
        if ((gesture.done || gesture.blocked || !gesture.startedAtTop) && isNewImpulse(abs, sign)) {
          if (busy()) {
            // Durante a troca vale o tempo de espera: este impulso não conta, nem depois dela.
            gesture.peak = abs;
            gesture.low = abs;
            gesture.rises = 0;
          } else {
            // Gesto novo no meio da inércia do anterior: pode trocar mais uma etapa.
            gesture = startGesture(now, abs, sign, false);
          }
        }
      }
      gesture.last = now;
      gesture.prev = abs;
      if (abs >= 2) gesture.sign = sign; // tremidas mínimas no fim da inércia não mudam o sentido

      // Gesto que começou fora do topo (ex.: inércia subindo a página) não troca etapa.
      if (!gesture.startedAtTop || !atTop()) return;

      if (gesture.done || gesture.blocked) {
        event.preventDefault();
        return;
      }

      const direction: Direction = dy > 0 ? 1 : -1;
      if (!wants(direction)) return; // ex.: última etapa + rolar para baixo = rolagem normal

      event.preventDefault();
      if (busy()) {
        gesture.blocked = true;
        return;
      }
      gesture.sum += dy;
      if (Math.abs(gesture.sum) >= wheelThreshold) {
        gesture.done = true;
        step(gesture.sum > 0 ? 1 : -1);
      }
    };

    // ---- Toque (celular e tablet) ----
    let touch: { x: number; y: number; startedAtTop: boolean; mode: "pending" | "capture" | "pass" } | null = null;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1 || dialogOpen()) {
        touch = null;
        return;
      }
      const point = event.touches[0];
      touch = { x: point.clientX, y: point.clientY, startedAtTop: atTop(), mode: "pending" };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touch) return;
      const point = event.touches[0];
      const dy = touch.y - point.clientY; // positivo = dedo subindo = "rolar para baixo"
      const dx = touch.x - point.clientX;
      if (touch.mode === "pending") {
        const undecided = Math.abs(dy) < 6 && Math.abs(dx) < 6;
        // Antes da última etapa, o hero responde nos dois sentidos: segura o início do gesto
        // para o navegador não começar a rolar a página.
        if (undecided) {
          if (touch.startedAtTop && atTop() && currentStep() < lastStep && event.cancelable) event.preventDefault();
          return;
        }
        if (Math.abs(dx) > Math.abs(dy) || !touch.startedAtTop || !atTop()) {
          touch.mode = "pass";
          return;
        }
        touch.mode = wants(dy > 0 ? 1 : -1) || busy() ? "capture" : "pass";
      }
      if (touch.mode === "capture" && event.cancelable) event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      const current = touch;
      touch = null;
      if (!current || current.mode !== "capture" || busy()) return;
      const dy = current.y - event.changedTouches[0].clientY;
      if (Math.abs(dy) < swipeThreshold) return;
      const direction: Direction = dy > 0 ? 1 : -1;
      if (wants(direction)) step(direction);
    };

    // ---- Teclado ----
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || dialogOpen()) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      let direction: Direction | 0 = 0;
      if (event.key === "ArrowDown" || event.key === "PageDown") direction = 1;
      else if (event.key === "ArrowUp" || event.key === "PageUp") direction = -1;
      else if (event.key === " ") {
        if (target?.closest("button, a, summary, [role='button']")) return;
        direction = event.shiftKey ? -1 : 1;
      }
      if (!direction || !atTop() || !wants(direction)) return;

      event.preventDefault();
      if (event.repeat || busy()) return;
      step(direction);
    };

    syncOverscroll();
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", syncOverscroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", syncOverscroll);
      root.classList.remove("ch-lock");
    };
  }, [enabled, lastStep]);
}
