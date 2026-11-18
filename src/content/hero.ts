// Conteúdo do hero cinematográfico (topo da página).
// Textos e imagens ficam aqui; tempos e sensibilidade da rolagem ficam em
// src/components/hero/heroConfig.ts.

export type HeroImageKey = "base" | "oportunidades" | "agendamentos" | "resultado";

// Mesma câmera e mesma oficina em todas. O estado 0 usa "base" com um filtro frio em CSS.
// Tamanho original: 2688 × 1520 (o next/image gera as versões menores). As imagens dos
// estados 3 e 4 têm 2752 × 1536 (mesma câmera); o quadro do hero corta a pequena sobra.
export const heroImages: Record<HeroImageKey, { src: string; alt: string }> = {
  base: {
    src: "/images/hero/cinematic/oficina-base.jpg",
    alt: "Oficina ampla e organizada vista do alto, com seis elevadores e quase nenhum carro",
  },
  oportunidades: {
    src: "/images/hero/cinematic/oficina-oportunidades.jpg",
    alt: "A mesma oficina com carros chegando e um cliente no balcão",
  },
  agendamentos: {
    src: "/images/hero/cinematic/oficina-agendamentos-03.jpg",
    alt: "A mesma oficina com quatro boxes ocupados e mecânicos trabalhando",
  },
  resultado: {
    src: "/images/hero/cinematic/oficina-resultado.04.jpg",
    alt: "A mesma oficina cheia e organizada, com os seis boxes ocupados e clientes na recepção",
  },
};

/** Interface desenhada em código que acompanha a cena. */
export type HeroUi = "none" | "visibility" | "messages" | "schedule";

export type HeroScene = {
  /** Nome da etapa no indicador de progresso e no aviso para leitores de tela. */
  label: string;
  /** Título. Trechos entre *asteriscos* aparecem em laranja. */
  title: string;
  text: string;
  image: HeroImageKey;
  /** "visibility" = pino + busca + anúncio; "messages" = mensagens; "schedule" = agenda + marcadores. */
  ui: HeroUi;
  /**
   * Só no celular (tela em pé): ponto horizontal da imagem, de 0 (esquerda) a 1 (direita),
   * que fica no centro da tela. É o "movimento de câmera" do recorte vertical.
   */
  mobileFocus: number;
};

// 5 estados = 4 avanços. A ordem aqui é a ordem da experiência.
export const heroScenes: HeroScene[] = [
  {
    label: "Início",
    title: "Sua oficina não deveria depender da *sorte* para ter movimento.",
    text: "Existe uma forma mais previsível de gerar novas oportunidades.",
    image: "base",
    ui: "none",
    // Fileira de elevadores vazios: a primeira cena do celular mostra a capacidade sobrando.
    mobileFocus: 0.42,
  },
  {
    label: "Visibilidade",
    title: "Tudo começa quando as *pessoas certas* encontram sua empresa.",
    text: "Estratégia e campanhas colocam sua oficina na frente de potenciais clientes da sua região.",
    image: "base",
    ui: "visibility",
    mobileFocus: 0.3,
  },
  {
    label: "Oportunidades",
    title: "Mais pessoas pedindo *orçamento*.",
    text: "Mais oportunidades reais chegando para sua equipe vender.",
    image: "oportunidades",
    ui: "messages",
    mobileFocus: 0.33,
  },
  {
    label: "Agendamentos",
    title: "Oportunidades atendidas. *Agendamentos confirmados.*",
    text: "Marketing e atendimento trabalhando juntos para transformar interesse em serviço.",
    image: "agendamentos",
    ui: "schedule",
    mobileFocus: 0.47,
  },
  {
    label: "Resultado",
    title: "Mais oportunidades entrando. Mais carros na oficina. *Mais vendas.*",
    text: "Estratégia, anúncios, criativos, tecnologia e atendimento trabalhando juntos para ajudar sua empresa a vender mais.",
    image: "resultado",
    ui: "none",
    mobileFocus: 0.58,
  },
];

/** Linha fixa acima do título (é o h1 da página). */
export const heroEyebrow = "Assessoria especializada de crescimento";

/** Botão do estado final. "#diagnostico" abre o formulário de diagnóstico. */
export const heroCta = { label: "Quero mais clientes para minha oficina", href: "#diagnostico" };

/** Textos das interfaces desenhadas em código (estados 1 a 3). */
export const heroUi = {
  search: {
    label: "Busca",
    query: "alinhamento e balanceamento perto de mim",
    result: "Sua oficina",
    meta: "Aberto agora · Ver rota",
  },
  ad: { label: "Patrocinado", title: "Revisão completa com hora marcada", action: "Agendar" },
  messages: {
    label: "Novas mensagens",
    items: ["Quanto fica a troca dos 4 pneus?", "Vocês fazem alinhamento?", "Tem horário hoje?"],
    chip: "+3 novos contatos",
  },
  schedule: {
    title: "Hoje",
    label: "Agenda",
    items: [
      { time: "10:00", service: "Troca de pneus" },
      { time: "13:30", service: "Alinhamento" },
      { time: "15:00", service: "Revisão" },
    ],
  },
  /** Elementos presos à imagem, em frações da imagem (0 a 1): acompanham a câmera. */
  anchors: {
    pin: { x: 0.225, y: 0.21 },
    // Sobre os carros dos boxes ocupados na imagem do estado 3 (vermelho, SUV branco, prata).
    bays: [
      { x: 0.46, y: 0.415 },
      { x: 0.555, y: 0.35 },
      { x: 0.7, y: 0.4 },
    ],
  },
};
