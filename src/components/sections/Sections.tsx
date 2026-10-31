import Image from "next/image";
import { benefits, differences, faqs, journey, method, pains, solutions } from "@/content/site";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`section-label ${light ? "section-label-light" : ""}`}><span className="label-line" aria-hidden="true"></span>{children}</p>;
}

function PhotoPlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`photo-placeholder ${className}`} role="img" aria-label={label}><span aria-hidden="true">?</span></div>;
}

const clientLogos = [
  ["casa do freio.png", "Casa do Freio"],
  ["casa dos pneus.png", "Casa dos Pneus"],
  ["elite center.png", "Elite Center"],
  ["fd pneus.png", "FD Pneus"],
  ["furtil pneus.png", "Furtil Pneus"],
  ["gabriel automoveis.png", "Gabriel Automóveis"],
  ["gigamax.png", "Gigamax"],
  ["gigante importadora.png", "Gigante Importadora"],
  ["gigante pneus.png", "Gigante Pneus"],
  ["good pneus.png", "Good Pneus"],
  ["grupobrasileiro.png", "Grupo Brasileiro"],
  ["gs pneus e mecanica.png", "GS Pneus e Mecânica"],
  ["gt.png", "GT Express"],
  ["havem.png", "Havem"],
  ["impacto-prime.png", "Impacto Prime"],
  ["inova pneus.png", "Inova Pneus"],
  ["ja.pneus.png", "JA Pneus"],
  ["km.png", "KM"],
  ["log pneus.png", "Log Pneus"],
  ["lucar.png", "Lucar"],
  ["marão.png", "Marcão Auto Center"],
  ["max.png", "Max"],
  ["mfcar.png", "MF Car"],
  ["msilva.png", "M Silva Auto Center"],
  ["muniauto center.png", "Muni Auto Center"],
  ["nb pneus.png", "NB Pneus"],
  ["onix.png", "Onix Serviços Automotivos"],
  ["pneus prime.png", "Pneus Prime"],
  ["pneusx.png", "Pneus X"],
  ["pro center.png", "Pro Center"],
  ["rg.png", "RG Pneus e Mecânica"],
  ["rl.png", "RL Amortecedores"],
  ["sa.png", "SA Pneus e Oficina Mecânica"],
  ["seuze.png", "Oficina Mecânica Seu Zé"],
  ["venesa.png", "Venesa"],
  ["verona.png", "Verona Prime"],
  ["vias.png", "Vias"],
] as const;

const logoRows = [
  clientLogos.filter((_, index) => index % 2 === 0),
  clientLogos.filter((_, index) => index % 2 === 1),
];

export function Hero() {
  return <section id="inicio" className="hero">
    <Image src="/images/hero/workshop-editorial.webp" alt="Ilustração editorial de um profissional trabalhando em um veículo em uma oficina" fill priority sizes="100vw" className="hero-image" />
    <div className="hero-shade" aria-hidden="true"></div>
    <div className="container hero-content">
      <div className="hero-top"><span>MARKETING PARA QUEM MOVE O MERCADO AUTOMOTIVO</span><span>ESTRATÉGIA · CAPTAÇÃO · ACOMPANHAMENTO</span></div>
      <div className="hero-main"><p className="hero-eyebrow">MARKETING E ESTRATÉGIA PARA OFICINAS E CENTROS AUTOMOTIVOS</p><h1>Sua oficina não precisa apenas de mais contatos. <em>Precisa transformar oportunidades em vendas.</em></h1><p className="hero-subtitle">A Giraffe combina estratégias de marketing, captação de clientes e acompanhamento comercial para ajudar sua empresa a crescer com mais controle e previsibilidade.</p><div className="hero-actions"><a className="button button-orange" href="#diagnostico">Quero meu diagnóstico <span aria-hidden="true">↗</span></a><a className="text-link light-link" href="#metodo">Conhecer nossa metodologia <span aria-hidden="true">↘</span></a></div></div>
      <div className="hero-bottom"><span>UMA VISÃO MAIS CLARA DO SEU CRESCIMENTO</span><a href="#confianca" aria-label="Ir para a próxima seção">DESLIZE PARA EXPLORAR <span aria-hidden="true">↓</span></a></div>
    </div>
    <span className="media-note">Imagem ilustrativa criada para esta página.</span>
  </section>;
}

export function TrustedBy() {
  return <section id="confianca" className="trusted section-tight"><div className="container">
    <SectionLabel>CONFIANÇA</SectionLabel>
    <h2>Empresas que confiam na Giraffe Assessoria</h2>
  </div><div className="trusted-marquees">
    {logoRows.map((logos, rowIndex) => <div key={rowIndex} className={`trusted-marquee ${rowIndex === 1 ? "trusted-marquee-reverse" : ""}`} role="region" aria-label={`Logotipos das empresas clientes, linha ${rowIndex + 1}`} tabIndex={0}>
      <div className="trusted-marquee-track">
        {[false, true].map((duplicate) => <ul key={duplicate ? "copy" : "original"} className="trusted-marquee-group" aria-hidden={duplicate || undefined}>
          {logos.map(([file, name]) => <li key={file} className="trusted-marquee-item">
            <Image src={`/images/logo-carrossel/${encodeURIComponent(file)}`} alt={duplicate ? "" : `Logo de ${name}`} width={1024} height={1024} sizes="(max-width: 760px) 100px, (max-width: 1100px) 112px, 128px" loading="lazy" />
          </li>)}
        </ul>)}
      </div>
    </div>)}
  </div></section>;
}

export function PainPoints() {
  return <section className="section section-light"><div className="container"><ScrollReveal><div className="section-heading split-heading"><div><SectionLabel>O CENÁRIO</SectionLabel><h2>Sua oficina trabalha muito, mas os resultados não acompanham o esforço?</h2></div><p>Talvez o próximo passo não seja fazer mais. É enxergar onde as oportunidades estão escapando.</p></div></ScrollReveal><div className="pain-grid">{pains.map((pain, i) => <ScrollReveal key={pain.title}><article className="pain-card"><span className="card-index">0{i + 1}</span><PhotoPlaceholder label={`Foto pendente: ${pain.title}`} className="pain-photo" /><div className="pain-copy"><h3>{pain.title}</h3><p>{pain.text}</p></div><span className="card-arrow" aria-hidden="true">↗</span></article></ScrollReveal>)}</div><p className="closing-statement">O problema nem sempre está na qualidade do serviço. Muitas vezes está na forma como sua empresa <strong>atrai, atende e acompanha</strong> os clientes.</p></div></section>;
}

export function Benefits() {
  return <section className="section section-dark benefits">
    <div className="container benefit-grid">
      <ScrollReveal><div><SectionLabel light>O QUE MUDA</SectionLabel><h2>Imagine sua oficina com uma estratégia comercial <em>mais organizada.</em></h2><a className="text-link light-link" href="#diagnostico">Vamos conversar sobre sua oficina <span aria-hidden="true">↗</span></a><PhotoPlaceholder label="Foto de oficina pendente" className="benefit-photo" /></div></ScrollReveal>
      <div className="benefit-list">{benefits.map((benefit, i) => <div key={benefit} className="benefit-item"><span>0{i + 1}</span><p>{benefit}</p></div>)}</div>
    </div>
    <ol className="benefit-ticker" aria-label="Jornada comercial">
      {journey.map((stage, i) => <li key={stage}><span className="ticker-index">0{i + 1}</span>{i < journey.length - 1 ? <span className="ticker-arrow" aria-hidden="true">→</span> : null}<strong>{stage}</strong></li>)}
    </ol>
  </section>;
}

export function CaseStudies() {
  return <section id="cases" className="section section-light cases"><div className="container"><ScrollReveal><div className="section-heading split-heading"><div><SectionLabel>EVIDÊNCIAS</SectionLabel><h2>Resultados são construídos na prática.</h2></div><p>Histórias reais precisam de contexto: desafio, período, solução e resultado verificado.</p></div></ScrollReveal><div className="case-grid"><article className="case-feature"><span className="label">CASES EM PREPARAÇÃO</span><PhotoPlaceholder label="Foto do primeiro case pendente" className="case-photo" /><div><h3>Uma história só vale quando pode ser comprovada.</h3><p>Este espaço receberá o primeiro case autorizado, com dados revisados e fonte identificada.</p></div></article><div className="case-side"><article><span className="label">DEPOIMENTOS EM VÍDEO</span><PhotoPlaceholder label="Imagem do depoimento em vídeo pendente" className="case-video-photo" /><h3>A voz de quem vive o resultado.</h3><p>Vídeos de clientes serão incorporados com autorização, legendas e controles acessíveis.</p></article><article><span className="label">TRANSPARÊNCIA</span><h3>Sem números de vitrine.</h3><p>Nomes, cidades, avaliações e percentuais aparecerão somente depois de confirmados.</p></article></div></div></div></section>;
}

export function GiraffeMethod() {
  return <section id="metodo" className="section section-orange method-section"><div className="container"><div className="method-intro"><SectionLabel>MÉTODO GIRAFFE · NOME EDITORIAL PROPOSTO</SectionLabel><h2>Crescimento precisa de estratégia, execução e acompanhamento.</h2><p>Um caminho claro para entender o negócio, agir e ajustar as decisões ao longo do tempo.</p></div><ol className="method-list">{method.map((step, i) => <li key={step.title}><span className="method-number">0{i + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div><span className="method-symbol" aria-hidden="true">↗</span></li>)}</ol></div></section>;
}

export function Solutions() {
  return <section id="solucoes" className="section section-light solutions"><div className="container"><ScrollReveal><div className="section-heading split-heading"><div><SectionLabel>SOLUÇÕES</SectionLabel><h2>As soluções certas para cada etapa do crescimento da sua empresa.</h2></div><p>A combinação de serviços é definida de acordo com o diagnóstico e com o que for contratado.</p></div></ScrollReveal><div className="solution-grid">{solutions.map((item, i) => <article key={item.title} className="solution-card"><span className="card-index">0{i + 1}</span><PhotoPlaceholder label={`Imagem ou interface pendente: ${item.title}`} className="solution-photo" /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></div></section>;
}

export function WhyGiraffe() {
  return <section className="section section-dark why"><div className="container why-grid"><div><SectionLabel light>POR QUE A GIRAFFE</SectionLabel><h2>Mais do que marketing. <em>Uma visão do crescimento da sua oficina.</em></h2><a className="button button-orange" href="#diagnostico">Solicitar diagnóstico <span aria-hidden="true">↗</span></a></div><ol>{differences.map((item, i) => <li key={item}><span>0{i + 1}</span>{item}</li>)}</ol></div></section>;
}

export function FAQ() {
  return <section id="faq" className="section section-light faq"><div className="container faq-grid"><div><SectionLabel>PERGUNTAS FREQUENTES</SectionLabel><h2>Ainda tem dúvidas? Entenda como funciona.</h2><p>Sem respostas prontas para todos os negócios. Aqui estão os pontos que costumam surgir na primeira conversa.</p></div><div className="faq-list">{faqs.map(({ question, answer }) => <details key={question}><summary>{question}<span className="faq-plus" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>;
}
