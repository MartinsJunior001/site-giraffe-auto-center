"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { navigation } from "@/content/site";

export function Header() {
  const [open, setOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);

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

  return <header className={`site-header ${pastHero ? "is-scrolled" : ""}`}>
    <div className="header-inner container">
      <a className="brand" href="#inicio" aria-label="Giraffe Assessoria, voltar ao início"><Image className="brand-logo" src="/images/logos/logo-giraffe-assessoria-branca.svg" alt="" width={160} height={59} unoptimized /></a>
      <nav className="desktop-nav" aria-label="Navegação principal">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
      <a className="button button-orange header-cta" href="#diagnostico">Solicitar diagnóstico <span aria-hidden="true">↗</span></a>
      <button ref={button} className="menu-toggle" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}><span></span><span></span></button>
    </div>
    <nav ref={menu} id="mobile-menu" className={`mobile-nav ${open ? "is-open" : ""}`} aria-label="Navegação móvel" inert={!open}>{navigation.map(item => <a key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<span aria-hidden="true">↗</span></a>)}<a className="mobile-diagnosis" href="#diagnostico" onClick={() => setOpen(false)}>Solicitar diagnóstico <span aria-hidden="true">↗</span></a></nav>
  </header>;
}
