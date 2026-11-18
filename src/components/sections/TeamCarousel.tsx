"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { team } from "@/content/site";
import { UiIcon } from "@/components/icons/UiIcon";

const AUTOPLAY_MS = 3200;
// Com poucas pessoas, a fila repete a equipe até ter cartões suficientes para preencher a tela.
const MIN_SLOTS = 9;
const people = team.length;
const slots = Array.from({ length: Math.max(people, Math.ceil(MIN_SLOTS / people) * people) }, (_, i) => i % people);
const count = slots.length;

// Distância circular entre o cartão e o ativo, para o carrossel girar sem fim.
function circularOffset(index: number, active: number) {
  let offset = (index - active) % count;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2 + (count % 2 === 0 ? 1 : 0)) offset += count;
  return offset;
}

function Silhouette() {
  return <svg className="team-silhouette" viewBox="0 0 120 150" aria-hidden="true" focusable="false">
    <circle cx="60" cy="52" r="26" />
    <path d="M14 150c2-34 22-54 46-54s44 20 46 54Z" />
  </svg>;
}

export function TeamCarousel() {
  // A posição anterior vem junto com a atual: serve para saber quem "dá a volta" na fila.
  const [{ active, previous }, setPosition] = useState({ active: 0, previous: 0 });
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const regionRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<number | null>(null);
  const swiped = useRef(false);

  // O avanço automático só roda com o carrossel visível; assim, ao abrir ou atualizar a página,
  // a primeira pessoa que o visitante vê é sempre a primeira da lista (Martins Junior, CEO).
  useEffect(() => {
    const element = regionRef.current;
    if (!element || !("IntersectionObserver" in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setPosition(current => ({ active: (current.active + 1) % count, previous: current.active }));
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, inView]);

  const go = (next: number) => setPosition(current => ({ active: ((next % count) + count) % count, previous: current.active }));

  // Arrastar com o dedo (ou o mouse) para os lados troca de pessoa.
  function onPointerDown(event: React.PointerEvent) {
    swipeStart.current = event.clientX;
    swiped.current = false;
  }

  function onPointerUp(event: React.PointerEvent) {
    if (swipeStart.current === null) return;
    const delta = event.clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(delta) < 40) return;
    swiped.current = true;
    go(active + (delta < 0 ? 1 : -1));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") { event.preventDefault(); go(active + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); go(active - 1); }
  }

  return <div
    ref={regionRef}
    className="team-carousel"
    role="region"
    aria-roledescription="carrossel"
    aria-label="Equipe Giraffe"
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)}
    onBlur={event => { if (!regionRef.current?.contains(event.relatedTarget as Node)) setPaused(false); }}
    onKeyDown={onKeyDown}
  >
    <ul className="team-track" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipeStart.current = null; }}>
      {slots.map((memberIndex, index) => {
        const member = team[memberIndex];
        const offset = circularOffset(index, active);
        const before = circularOffset(index, previous);
        const distance = Math.abs(offset);
        // Quem dá a volta (de uma ponta à outra) troca de lado sem animar, para não atravessar a fila.
        const wraps = Math.abs(offset - before) > 1;
        return <li
          key={index}
          className={`team-card${offset === 0 ? " is-active" : ""}${wraps ? " no-transition" : ""}`}
          style={{ "--offset": offset, "--distance": distance } as React.CSSProperties}
          aria-hidden={distance > 1 || undefined}
        >
          <button type="button" className="team-card-inner" onClick={() => { if (swiped.current) { swiped.current = false; return; } go(index); }} tabIndex={distance > 1 ? -1 : 0} aria-current={offset === 0 || undefined}>
            <span className="team-photo">
              {member.photo ? <Image src={member.photo} alt="" fill sizes="260px" /> : <Silhouette />}
            </span>
            <span className="team-caption">
              <strong>{member.name}</strong>
              <span>{member.role}</span>
            </span>
          </button>
        </li>;
      })}
    </ul>
    <div className="team-controls">
      <button type="button" className="team-arrow" onClick={() => go(active - 1)} aria-label="Pessoa anterior"><UiIcon name="left" /></button>
      <span className="team-counter" aria-live={paused ? "polite" : "off"}>{String(slots[active] + 1).padStart(2, "0")} / {String(people).padStart(2, "0")}</span>
      <button type="button" className="team-arrow" onClick={() => go(active + 1)} aria-label="Próxima pessoa"><UiIcon name="right" /></button>
    </div>
  </div>;
}
