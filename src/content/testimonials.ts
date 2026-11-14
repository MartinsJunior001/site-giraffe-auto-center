export type Testimonial = {
  id: string;
  title: string;
  company: string;
  name?: string;
  quote?: string;
  rating?: number;
  avatarSrc?: string;
  /** ID do vídeo no YouTube: o trecho depois de /shorts/ no link do Short. */
  youtubeId?: string;
  posterSrc?: string;
};

// Vídeos publicados no canal da Giraffe no YouTube. O player oficial só é carregado quando o visitante
// clica no card; até lá, nada é baixado do YouTube.
// Capas e avatares ficam em public/images/videos: as capas da Brava, Giga Max, Marcão e RL Pneus são quadros
// dos próprios vídeos; a da Casa do Freio é a miniatura oficial do Short.
// Os cards sem youtubeId permanecem como espaços reservados e não abrem o player.
// As citações são trechos condensados das falas legendadas nos próprios vídeos.
// Mantenha cada citação entre 79 e 86 caracteres: é o que ocupa 3 linhas no card em desktop e celular.
export const testimonials: Testimonial[] = [
  {
    id: "casa-do-freio-araraquara",
    title: "Depoimento do cliente",
    name: "João Romanine",
    company: "Casa do Freio",
    quote: "Carro não falta, tem de sobra. Já estamos com a segunda unidade. O pessoal é fera.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-casa-do-freio.jpg",
    youtubeId: "G0hQ0EXTIdI",
    posterSrc: "/images/videos/casa-do-freio-araraquara.jpg",
  },
  {
    id: "brava-servicos-automotivos",
    title: "Depoimento do cliente",
    name: "Pedro",
    company: "Brava Serviços Automotivos",
    quote: "Agendamento todos os dias, clientes sempre chegando. A Giraffe é a empresa certa.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-brava.jpg",
    youtubeId: "MC_IpRe0u7E",
    posterSrc: "/images/videos/brava-servicos-automotivos.jpg",
  },
  {
    id: "giga-max-ribeirao-preto",
    title: "Depoimento do cliente",
    name: "Márcio",
    company: "Giga Max Ribeirão Preto",
    quote: "Aumentou o fluxo de carro e o fluxo de caixa. Faturamento aumentou uns 30, 40%.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-giga-max.jpg",
    youtubeId: "wffiDZLdOfY",
    posterSrc: "/images/videos/giga-max-ribeirao-preto.jpg",
  },
  {
    id: "marcao-auto-center-presidente-prudente",
    title: "Depoimento do cliente",
    name: "Marcão",
    company: "Marcão Auto Center",
    quote: "Não me arrependo um minuto. É loja cheia todo dia, não tem errado. Eu recomendo.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-marcao.jpg",
    youtubeId: "XX69-SNlI_c",
    posterSrc: "/images/videos/marcao-auto-center-presidente-prudente.jpg",
  },
  {
    id: "rl-pneus-e-oficina",
    title: "Depoimento do cliente",
    name: "Rubão",
    company: "RL Pneus e Oficina",
    quote: "Estou super satisfeito com a parceria e com o resultado. Eu super recomendo a Giraffe.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-rl-pneus.jpg",
    youtubeId: "Sp8-OCWHF-0",
    posterSrc: "/images/videos/rl-pneus-e-oficina-pocos-de-caldas.jpg",
  },
];
