import Image from "next/image";
import { DiagnosisForm } from "@/components/sections/DiagnosisForm";

// O botão do card abre o formulário de 4 etapas (DiagnosisForm), que envia para /api/leads e leva a /obrigado.
export function Diagnosis() {
  return <section id="diagnostico" className="section diagnosis"><div className="container diagnosis-grid"><div className="diagnosis-copy"><p className="section-label section-label-light"><span className="label-line" aria-hidden="true"></span>PRÓXIMO PASSO</p><h2>Descubra o que pode estar limitando o crescimento da sua oficina.</h2><p>Conte um pouco sobre a sua operação. O diagnóstico parte da sua realidade, sem promessas prontas.</p><div className="diagnosis-aside"><span>01 — ENTENDER</span><span>02 — CONVERSAR</span><span>03 — PLANEJAR</span></div></div><div className="diagnosis-card"><div className="diagnosis-card-media"><Image src="/images/diagnostico/consultoria-oficina.jpg" alt="Consultor mostra dados em um tablet para uma mecânica dentro da oficina" fill sizes="(max-width: 1100px) 92vw, 42vw" /></div><div className="diagnosis-card-body"><p className="diagnosis-card-label">DIAGNÓSTICO ESTRATÉGICO</p><h3>Sua oficina está aproveitando todo o seu potencial?</h3><p>Conte um pouco sobre seu negócio e descubra onde podemos ajudar sua empresa a crescer.</p><DiagnosisForm /></div></div></div></section>;
}
