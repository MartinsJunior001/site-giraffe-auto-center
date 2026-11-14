export type Testimonial = {
  id: string;
  title: string;
  company: string;
  name?: string;
  quote?: string;
  rating?: number;
  avatarSrc?: string;
  videoSrc?: string;
  posterSrc?: string;
  captionsSrc?: string;
};

// Vídeos em public/videos-clientes; capas e avatares em public/images/videos.
// Os cards sem videoSrc permanecem como espaços reservados e não abrem o player.
// As citações são trechos condensados das falas legendadas nos próprios vídeos.
// Mantenha cada citação entre 79 e 86 caracteres: é o que ocupa 3 linhas no card em desktop e celular.
export const testimonials: Testimonial[] = [
  {
    id: "brava-servicos-automotivos",
    title: "Depoimento do cliente",
    name: "Pedro",
    company: "Brava Serviços Automotivos",
    quote: "Agendamento todos os dias, clientes sempre chegando. A Giraffe é a empresa certa.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-brava.jpg",
    videoSrc: "/videos-clientes/brava.serviços.automotivos.mp4",
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
    videoSrc: "/videos-clientes/giga.max.ribeirão.preto.mp4",
    posterSrc: "/images/videos/giga-max-ribeirao-preto.jpg",
  },
  {
    id: "rl-pneus-e-oficina",
    title: "Depoimento do cliente",
    name: "Rubão",
    company: "RL Pneus e Oficina",
    quote: "Estou super satisfeito com a parceria e com o resultado. Eu super recomendo a Giraffe.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-rl-pneus.jpg",
    videoSrc: "/videos-clientes/rl.pneuseoficina.poçosdecaldas.mp4",
    posterSrc: "/images/videos/rl-pneus-e-oficina-pocos-de-caldas.jpg",
  },
  {
    id: "marcao-auto-center-presidente-prudente",
    title: "Depoimento do cliente",
    name: "Marcão",
    company: "Marcão Auto Center",
    quote: "Não me arrependo um minuto. É loja cheia todo dia, não tem errado. Eu recomendo.",
    rating: 5,
    avatarSrc: "/images/videos/avatar-marcao.jpg",
    videoSrc: "/videos-clientes/mercão.auto.center. presidenteprudente.mp4",
    posterSrc: "/images/videos/marcao-auto-center-presidente-prudente.jpg",
  },
];
