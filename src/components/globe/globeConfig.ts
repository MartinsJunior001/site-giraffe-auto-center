// Globo interativo da seção "O que é a Giraffe".
// Enquadramento, zoom, velocidade e pontos ficam aqui; o desenho fica em globeRenderer.ts.

export type LonLat = [longitude: number, latitude: number];

export const GLOBE = {
  /** Dados do mapa (Natural Earth via world-atlas 2.0.2): mundo em 1:110m e América do Sul em 1:50m. */
  dataUrl: "/data/globo-brasil.json",
  /** Código ISO 3166-1 numérico do Brasil nos dados. */
  brazilId: "076",

  /** Ponto do mapa que fica de frente para a câmera em repouso [longitude, latitude]: o Brasil. */
  home: [-53.5, -15] as LonLat,
  /** Distância da câmera ao centro do globo, em raios. Quanto menor, mais perspectiva (o Brasil parece maior). */
  cameraDistance: 3.4,
  /** Raio do globo em relação ao menor lado da área, no zoom inicial (0,5 = encosta nas bordas). */
  radius: 0.455,

  /** Zoom: 1 é o enquadramento inicial; o mínimo afasta um pouco; o máximo deixa o Brasil grande na área. */
  zoom: { min: 0.88, initial: 1, max: 2.4 },
  /** Sensibilidade da rolagem do mouse no zoom (maior = mais rápido). */
  wheelZoomSpeed: 0.0016,
  /** O zoom pela rolagem só liga com o cursor parado sobre o globo por este tempo (ms)... */
  wheelIntentMs: 350,
  /** ...e se a página não rolou neste intervalo (ms). Assim, quem está rolando a página passa direto. */
  pageScrollQuietMs: 450,
  /** Eventos de rolagem com intervalo menor que este (ms) contam como o mesmo gesto. */
  wheelGestureGapMs: 260,

  /** O globo não gira sozinho: fica centralizado no Brasil e só se move quando a pessoa o arrasta.
      Depois da última interação, espera este tempo (ms) e volta sozinho ao Brasil e ao zoom inicial.
      Com o cursor sobre o globo, a espera só começa quando ele sai. */
  returnDelayMs: 2500,
  /** Duração da volta (ms): um ajuste pequeno volta rápido; meia volta usa o máximo. */
  returnMs: { min: 700, max: 1600 },
  /** Inclinação máxima ao arrastar na vertical (graus de latitude no centro). */
  maxTilt: 60,

  /** Pontos ilustrativos (sem nomes nem números); o primeiro é o ponto principal, no Sudeste. */
  points: [
    [-47.2, -22.4],
    [-61.0, -4.2],
    [-52.4, -3.9],
    [-39.6, -6.2],
    [-41.6, -12.4],
    [-55.6, -12.6],
    [-49.6, -16.1],
    [-52.0, -28.1],
  ] as LonLat[],
  tooltip: "Atendimento em todo o Brasil",
} as const;
