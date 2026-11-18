"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// Mostra o conteúdo só depois do evento "load" da página (hero, fontes e scripts iniciais já baixados).
// Usado em imagens abaixo da dobra que o navegador começaria a baixar junto com a imagem principal do hero
// (a margem do loading="lazy" nativo alcança as seções logo abaixo). Assim a banda do carregamento inicial
// fica para o que aparece primeiro. O espaço de cada imagem é reservado no CSS: nada se move quando ela entra.
const subscribe = (onChange: () => void) => {
  window.addEventListener("load", onChange, { once: true });
  return () => window.removeEventListener("load", onChange);
};
const loadedOnClient = () => document.readyState === "complete";
const notLoadedOnServer = () => false;

export function AfterPageLoad({ children }: { children: ReactNode }) {
  const loaded = useSyncExternalStore(subscribe, loadedOnClient, notLoadedOnServer);
  return loaded ? children : null;
}
