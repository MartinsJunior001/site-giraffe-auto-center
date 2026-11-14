"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Props = { src: string; poster?: string; vertical?: boolean; redirectTo: string };

// Vídeo de boas-vindas: começa sem som; o botão sobreposto reinicia com som.
// Ao terminar, leva a pessoa ao destino do botão principal.
export function ThankYouVideo({ src, poster, vertical = false, redirectTo }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [withSound, setWithSound] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  function listenFromStart() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.play().catch(() => {});
    setWithSound(true);
    trackEvent("thanks_video_sound");
  }

  function handleEnded() {
    trackEvent("thanks_video_end");
    window.location.href = redirectTo;
  }

  return <div className={`thanks-video${vertical ? " is-vertical" : ""}`}>
    <video ref={videoRef} src={src} poster={poster} autoPlay muted playsInline preload="auto" controls={withSound} onEnded={handleEnded}>
      Seu navegador não suporta a reprodução deste vídeo.
    </video>
    {withSound ? null : <button className="thanks-sound" type="button" onClick={listenFromStart}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="m16 9.5 5 5m0-5-5 5" /></svg>
      Clique para ouvir desde o início
    </button>}
  </div>;
}
