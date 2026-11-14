"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/content/site";
import { whatsappUrl } from "@/content/diagnosis";
import { UiIcon } from "@/components/icons/UiIcon";

const whatsappHref = whatsappUrl();

// Descobre se o fundo logo atrás da barra é claro ou escuro, subindo pelos elementos
// até achar uma cor de fundo opaca. Imagens (como a do topo) ficam sobre fundo preto.
function backgroundToneAt(x: number, y: number, header: HTMLElement): "light" | "dark" {
  const target = document.elementsFromPoint(x, y).find(element => !header.contains(element));
  for (let element: Element | null = target ?? null; element; element = element.parentElement) {
    const match = getComputedStyle(element).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!match || (match[4] !== undefined && Number(match[4]) < 0.5)) continue;
    const [r, g, b] = [match[1], match[2], match[3]].map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150 ? "light" : "dark";
  }
  return "light";
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const [tone, setTone] = useState<"light" | "dark">("dark");
  const headerRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const header = headerRef.current;
      const bar = barRef.current?.getBoundingClientRect();
      if (!header || !bar) return;
      setTone(backgroundToneAt(bar.left + bar.width / 2, bar.top + bar.height / 2, header));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, []);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { rootMargin: "-76px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = menu.current?.querySelector<HTMLElement>("a");
    const focusFrame = requestAnimationFrame(() => first?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(focusFrame); window.removeEventListener("keydown", onKey); };
  }, [open]);

  return <header ref={headerRef} className={`site-header ${pastHero ? "is-scrolled" : ""} ${tone === "light" ? "is-light" : ""}`}>
    <div ref={barRef} className="header-inner container">
      <a className="brand" href="#inicio" aria-label="Giraffe Assessoria, voltar ao início"><Image className="brand-logo brand-logo-white" src="/images/logos/logo-giraffe-assessoria-branca.svg" alt="" width={160} height={59} unoptimized /><Image className="brand-logo brand-logo-dark" src="/images/logos/logo-giraffe-assessoria-preta.svg" alt="" width={160} height={59} unoptimized /></a>
      <nav className="desktop-nav" aria-label="Navegação principal">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <div className="header-actions">
        <a className="button button-orange header-btn header-cta" href="#diagnostico">Solicitar diagnóstico <UiIcon name="up-right" /></a>
        {whatsappHref ? <a className="button button-dark header-btn" href={whatsappHref} target="_blank" rel="noopener noreferrer">Falar no WhatsApp <UiIcon name="up-right" /></a> : null}
      </div>
      <button ref={button} className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}><UiIcon name={open ? "close" : "menu"} /></button>
    </div>
    <nav ref={menu} id="mobile-menu" className={`mobile-nav ${open ? "is-open" : ""}`} aria-label="Navegação móvel" inert={!open}>{navigation.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<UiIcon name="up-right" /></a>)}<a className="mobile-diagnosis" href="#diagnostico" onClick={() => setOpen(false)}>Solicitar diagnóstico <UiIcon name="up-right" /></a>{whatsappHref ? <a className="mobile-whatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>Falar no WhatsApp <UiIcon name="up-right" /></a> : null}</nav>
  </header>;
}
