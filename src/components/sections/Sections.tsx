import Image from "next/image";
import { aboutFacts, benefits, differences, faqs, journey, pains, solutions, type FeatureCard } from "@/content/site";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { TestimonialGallery } from "@/components/sections/TestimonialGallery";
import { TeamCarousel } from "@/components/sections/TeamCarousel";
import { UiIcon } from "@/components/icons/UiIcon";

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`section-label ${light ? "section-label-light" : ""}`}><span className="label-line" aria-hidden="true"></span>{children}</p>;
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

export function TrustedBy() {
  return <section id="confianca" className="trusted section-tight"><div className="container">
    <SectionLabel>CONFIANÇA</SectionLabel>
    <h2>Empresas que confiaram na Giraffe Assessoria</h2>
  </div><div className="trusted-marquees container">
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

export function About() {
  return <section id="sobre" className="section section-light about"><div className="container about-grid">
    <ScrollReveal className="about-copy">
      <SectionLabel>SOBRE NÓS</SectionLabel>
      <h2>O que é a <em>Giraffe Assessoria</em></h2>
      <p className="about-tagline">Uma assessoria de marketing especializada em acelerar o processo de vendas de empresas do setor automotivo.</p>
      <p className="about-lead">Nossa experiência foi construída ao lado de oficinas e centros automotivos de todo o Brasil, com <strong>processos sólidos e estratégias validadas em milhares de anúncios</strong>, focadas em atrair mais clientes e gerar resultados.</p>
      <dl className="about-facts">
        {aboutFacts.map(fact => <div key={fact.value} className="about-fact"><dt>{fact.value}</dt><dd>{fact.label}</dd></div>)}
      </dl>
      <a className="button button-orange about-cta" href="#diagnostico">Quero saber como vender mais <UiIcon name="up-right" /></a>
    </ScrollReveal>
    <ScrollReveal className="about-visual">
      <figure className="about-media"><Image src="/images/sobre/oficina-em-movimento.jpg" alt="Ilustração de um centro automotivo movimentado, com recepção ao cliente e carros em atendimento" fill sizes="(max-width: 900px) 92vw, 45vw" /></figure>
    </ScrollReveal>
  </div></section>;
}

// Cartões no estilo da referência: rótulo numerado, título, texto, foto e botão de largura total.
// O primeiro cartão de cada grupo leva o botão laranja; os demais, o botão claro.
function FeatureCards({ items, label }: { items: FeatureCard[]; label: string }) {
  return <ol className={`feature-grid feature-grid-${items.length}`} aria-label={label}>
    {items.map((item, i) => <li key={item.title} className="feature-card">
      <p className="feature-tag">0{i + 1} {item.tag}</p>
      <h3>{item.title}</h3>
      <p className="feature-text">{item.text}</p>
      <div className="feature-bottom">
        <figure className="feature-media"><Image src={item.image} alt={item.alt} fill sizes="(max-width: 760px) 92vw, (max-width: 1200px) 46vw, 30vw" loading="lazy" /></figure>
        <a className={`button ${i === 0 ? "button-orange" : "button-light"} feature-button`} href="#diagnostico">{item.cta} <UiIcon name="up-right" /></a>
      </div>
    </li>)}
  </ol>;
}

export function PainPoints() {  return <section className="section pain-section"><div className="container"><ScrollReveal><div className="section-heading pain-heading"><h2>Sua oficina trabalha muito, mas os resultados não acompanham o esforço?</h2><p>Esses são alguns dos desafios mais comuns:</p></div></ScrollReveal><FeatureCards items={pains} label="Desafios comuns das oficinas" /></div></section>;
}

export function Benefits() {
  return <section className="section section-dark benefits">
    <div className="container benefit-grid">
      <ScrollReveal><div><SectionLabel light>O QUE MUDA</SectionLabel><h2>Imagine sua oficina com uma estratégia comercial <em>mais organizada.</em></h2><a className="text-link light-link" href="#diagnostico">Vamos conversar sobre sua oficina <UiIcon name="up-right" /></a></div></ScrollReveal>
      <div className="benefit-list">{benefits.map((benefit, i) => <div key={benefit} className="benefit-item"><span>0{i + 1}</span><p>{benefit}</p></div>)}</div>
    </div>
    <ol className="benefit-ticker" aria-label="Jornada comercial">
      {journey.map((stage, i) => <li key={stage}><span className="ticker-index">0{i + 1}</span>{i < journey.length - 1 ? <UiIcon name="right" className="ticker-arrow" /> : null}<strong>{stage}</strong></li>)}
    </ol>
  </section>;
}

export function CaseStudies() {
  return <section id="cases" className="section section-light cases"><div className="container"><ScrollReveal><div className="section-heading split-heading"><div><SectionLabel>EVIDÊNCIAS</SectionLabel><h2>Resultados são construídos na prática.</h2></div><p>Histórias reais precisam de contexto: desafio, período, solução e resultado verificado.</p></div></ScrollReveal><TestimonialGallery /></div></section>;
}

export function Solutions() {
  return <section id="solucoes" className="section section-light solutions"><div className="container"><ScrollReveal><div className="section-heading split-heading"><div><SectionLabel>SOLUÇÕES</SectionLabel><h2>As soluções certas para cada etapa do crescimento da sua empresa.</h2></div><p>A combinação de serviços é definida de acordo com o diagnóstico e com o que for contratado.</p></div></ScrollReveal><FeatureCards items={solutions} label="Soluções da Giraffe" /></div></section>;
}

export function WhyGiraffe() {
  return <section className="section section-dark why"><div className="container why-grid"><div><SectionLabel light>POR QUE A GIRAFFE</SectionLabel><h2>Mais do que marketing. <em>Uma visão do crescimento da sua oficina.</em></h2><a className="button button-orange" href="#diagnostico">Solicitar diagnóstico <UiIcon name="up-right" /></a></div><ol>{differences.map((item, i) => <li key={item}><span>0{i + 1}</span>{item}</li>)}</ol></div>
    <div className="container team-heading"><SectionLabel light>NOSSA EQUIPE</SectionLabel><h3>Pessoas que entendem o dia a dia da sua oficina.</h3><p>Nossa equipe é treinada e especializada no setor automotivo, com conhecimento<br className="desktop-break" /> das necessidades de oficinas mecânicas e centros automotivos para desenvolver estratégias<br className="desktop-break" /> que geram resultados.</p></div>
    <TeamCarousel />
  </section>;
}

export function FAQ() {
  return <section id="faq" className="section section-light faq"><div className="container faq-grid"><div><SectionLabel>PERGUNTAS FREQUENTES</SectionLabel><h2>Ainda tem dúvidas? Entenda como funciona.</h2><p>Sem respostas prontas para todos os negócios. Aqui estão os pontos que costumam surgir na primeira conversa.</p></div><div className="faq-list">{faqs.map(({ question, answer }) => <details key={question}><summary>{question}<UiIcon name="plus" className="faq-plus" /></summary><p>{answer}</p></details>)}</div></div></section>;
}
