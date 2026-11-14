// Ajustes de movimento e de rolagem do hero cinematográfico.
// Tempos em milissegundos; distâncias em pixels.

export const HERO_MOTION = {
  /** Duração de cada avanço ou volta de etapa (recomendado: 700 a 1000). */
  transitionMs: 900,
  /** Duração da troca usada por "Pular introdução". */
  skipMs: 650,
  /**
   * Zoom da câmera em cada estado, do 0 ao 4 (1 = imagem inteira; nunca use menos que 1).
   * A câmera aproxima aos poucos e recua no estado 4, revelando a oficina cheia.
   */
  cameraZoom: [1, 1.02, 1.04, 1.06, 1],
  /** Curva principal das trocas (imagem e câmera). */
  ease: "power2.inOut",
} as const;

export const HERO_INPUT = {
  /** Quanto a roda do mouse ou o trackpad precisa rolar, num mesmo gesto, para trocar de etapa. */
  wheelThreshold: 45,
  /** Distância mínima do deslize no celular para trocar de etapa. */
  swipeThreshold: 48,
  /**
   * Pausa sem eventos de rolagem que encerra um gesto. Um gesto troca no máximo uma etapa;
   * a inércia do trackpad faz parte do mesmo gesto, então não pula duas etapas.
   */
  gestureGapMs: 220,
  /**
   * Trackpad: um gesto novo pode começar durante a inércia do anterior, sem pausa entre eles.
   * Ele é reconhecido quando o movimento, depois de cair para menos de `newGestureDecay` do pico,
   * volta a crescer por dois eventos seguidos até pelo menos `newGestureRise` vezes o ponto mais
   * baixo (e no mínimo `newGestureMinPx`), ou quando muda de sentido. A inércia de um mesmo gesto
   * só desacelera, então não conta. Só vale depois que a troca em andamento termina.
   */
  newGestureDecay: 0.4,
  newGestureRise: 2,
  newGestureMinPx: 10,
  /** Até quantos pixels rolados a página ainda conta como "no topo" (onde o hero responde). */
  topTolerance: 2,
} as const;
