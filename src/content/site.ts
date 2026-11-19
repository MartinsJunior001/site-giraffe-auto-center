export const siteName = "Giraffe Assessoria";
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// Perfis oficiais da Giraffe nas redes sociais (rodapé e dados estruturados da página).
export const socialLinks = [
  { name: "instagram", label: "Instagram", href: "https://www.instagram.com/giraffe_assessoria" },
  { name: "facebook", label: "Facebook", href: "https://www.facebook.com/giraffeassessoria" },
  { name: "youtube", label: "YouTube", href: "https://www.youtube.com/@Giraffe-Assessoria" },
] as const;

export const navigation = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Soluções", href: "#solucoes" },
  { label: "Cases", href: "#cases" },
  { label: "FAQ", href: "#faq" },
];

// Cartões das seções de desafios e soluções: tag (rótulo mono), imagem e texto do botão.
// Todos os botões abrem o formulário de diagnóstico (#diagnostico).
export type FeatureCard = { title: string; text: string; tag: string; image: string; alt: string; cta: string };

export const pains: FeatureCard[] = [
  { title: "Agenda irregular", text: "Tem semana cheia e outras sem movimento.", tag: "Movimento", image: "/images/cards/desafio-agenda.jpg", alt: "Oficina com boxes vazios e mecânico esperando clientes", cta: "Encher minha agenda" },
  { title: "Contatos que não fecham", text: "Muitos orçamentos sem retorno.", tag: "Conversão", image: "/images/cards/desafio-orcamentos.jpg", alt: "Atendente olhando um orçamento enquanto o cliente vai embora", cta: "Fechar orçamentos" },
  { title: "Investimento sem clareza", text: "Não sabe o que funciona e desperdiça dinheiro.", tag: "Investimento", image: "/images/cards/desafio-investimento.jpg", alt: "Dono de oficina preocupado olhando o notebook e notas fiscais", cta: "Investir com clareza" },
  { title: "Oportunidades perdidas", text: "Clientes que não voltam e indicações que não acontecem.", tag: "Relacionamento", image: "/images/cards/desafio-oportunidades.jpg", alt: "Carro saindo da oficina ao entardecer", cta: "Recuperar clientes" },
];

export const benefits = [
  "Mais oportunidades de contato com clientes interessados.",
  "Atendimento e acompanhamento comercial organizados.",
  "Mais clareza sobre agendamentos e vendas.",
  "Decisões orientadas por indicadores.",
  "Processos que apoiam um crescimento sustentável.",
];

export const journey = ["Atrair", "Atender", "Converter", "Acompanhar"];

export const solutions: FeatureCard[] = [
  { title: "Tráfego pago", text: "Alcançar potenciais clientes na região.", tag: "Atrair", image: "/images/cards/solucao-trafego.jpg", alt: "Celular mostrando um anúncio de serviço automotivo", cta: "Atrair mais clientes" },
  { title: "Redes sociais", text: "Fortalecer presença e confiança.", tag: "Presença", image: "/images/cards/solucao-redes.jpg", alt: "Mecânico gravando um vídeo do serviço com o celular", cta: "Fortalecer minha marca" },
  { title: "Sites e landing pages", text: "Transformar visitas em oportunidades.", tag: "Conversão", image: "/images/cards/solucao-sites.jpg", alt: "Notebook no balcão da oficina mostrando um site", cta: "Ter um site que vende" },
  { title: "CRM e organização comercial", text: "Acompanhar contatos e negociações.", tag: "Organização", image: "/images/cards/solucao-crm.jpg", alt: "Atendente organizando clientes em um tablet na recepção", cta: "Organizar meu comercial" },
  { title: "Automação de atendimento", text: "Agilizar processos quando contratada e integrada.", tag: "Atendimento", image: "/images/cards/solucao-automacao.jpg", alt: "Celular com conversa de atendimento sobre o balcão da oficina", cta: "Agilizar o atendimento" },
  { title: "Indicadores e relatórios", text: "Entender os resultados com mais clareza.", tag: "Resultados", image: "/images/cards/solucao-indicadores.jpg", alt: "Dono da oficina e consultor analisando gráficos em um monitor", cta: "Ver meus resultados" },
];

// Seção "Sobre nós". Números informados pela Giraffe (material institucional enviado em 13/11/2026;
// investimento em anúncios atualizado para +20 mi em 18/11/2026).
export const aboutFacts = [
  { value: "+120 mi", label: "em vendas para clientes" },
  { value: "+50", label: "clientes ativos" },
  { value: "+2.354", label: "serviços prestados" },
  { value: "+20 mi", label: "investidos em anúncios" },
] as const;

// Carrossel da equipe (seção "Por que a Giraffe"). Fotos recortadas em retrato 4:5 (800×1000)
// em public/images/equipe/, a partir dos originais em public/images/nossa-equipe/.
// Para incluir alguém, acrescente um item; sem foto, o cartão mostra uma silhueta.
// O carrossel abre no primeiro item, com o último à esquerda e o segundo à direita.
// Não usar rostos gerados por IA como se fossem a equipe.
export type TeamMember = { name: string; role: string; photo?: string };

export const team: TeamMember[] = [
  { name: "Martins Junior", role: "CEO e Fundador", photo: "/images/equipe/martins-junior.jpg" },
  { name: "Alex Martins", role: "COO e Sócio Proprietário", photo: "/images/equipe/alex-martins.jpg" },
  { name: "Jhennipher Martins", role: "Customer Success", photo: "/images/equipe/jhennipher-martins.jpg" },
  { name: "Hiago Henrique", role: "Gestor de Tráfego", photo: "/images/equipe/hiago-henrique.jpg" },
  { name: "Matheus Martins", role: "Gestor de Tráfego", photo: "/images/equipe/matheus-martins.jpg" },
  { name: "Matheus Aurélio", role: "Web Designer", photo: "/images/equipe/matheus.jpg" },
  { name: "Naiara Silva", role: "Designer", photo: "/images/equipe/naiara-silva.jpg" },
  { name: "João Pedro", role: "Designer", photo: "/images/equipe/joao-pedro.jpg" },
  { name: "Richard Martins", role: "Designer", photo: "/images/equipe/richard-martins.jpg" },
  { name: "Ryan Barbosa", role: "Videomaker", photo: "/images/equipe/ryan-barbosa.jpg" },
  // Último da lista = primeiro à esquerda do Martins Junior quando o carrossel (circular) abre.
  { name: "Daine Silva", role: "Financeiro e Fundadora", photo: "/images/equipe/daine-silva.jpg" },
];

export const faqs = [
  { question: "Já tentei tráfego pago e não tive resultados. O que muda?", answer: "Antes de investir, é importante entender o público, a oferta e como os contatos são atendidos. O diagnóstico identifica possíveis gargalos; a estratégia depende do contexto da sua oficina." },
  { question: "Minha oficina precisa de equipe comercial?", answer: "Não necessariamente. O essencial é ter uma pessoa responsável por responder, acompanhar e registrar os contatos. A estrutura recomendada depende do volume de oportunidades." },
  { question: "Em quanto tempo posso começar a perceber resultados?", answer: "O prazo varia conforme mercado, investimento, oferta e capacidade de atendimento. No diagnóstico, conversamos sobre um plano e indicadores adequados ao seu cenário, sem prometer um prazo fixo." },
  { question: "Quanto preciso investir?", answer: "O investimento em serviços e mídia é definido após entender objetivos, região e estrutura da empresa. Nenhum valor é presumido antes dessa conversa." },
  { question: "A Giraffe atende oficinas pequenas?", answer: "A adequação da parceria depende mais dos objetivos e da capacidade de atendimento do que do tamanho da empresa. O diagnóstico ajuda a avaliar isso." },
  { question: "Como funciona o acompanhamento?", answer: "O formato e a frequência são definidos na proposta de cada contratação. A ideia é acompanhar os indicadores que ajudam a entender contatos, agendamentos e vendas." },
  { question: "Existe fidelidade ou posso cancelar?", answer: "Prazo, renovação e cancelamento dependem das condições da proposta e do contrato apresentados antes da contratação." },
];
