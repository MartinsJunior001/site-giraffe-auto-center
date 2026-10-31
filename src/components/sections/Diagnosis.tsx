"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Lead = { difficulty: string; role: string; units: string; city: string; name: string; company: string; phone: string; email: string; consent: boolean };
const initial: Lead = { difficulty: "", role: "", units: "", city: "", name: "", company: "", phone: "", email: "", consent: false };

export function Diagnosis() {
  const [lead, setLead] = useState<Lead>(initial);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const started = useRef(0);
  useEffect(() => { started.current = Date.now(); }, []);
  const honeypot = useRef<HTMLInputElement>(null);
  const update = (field: keyof Lead, value: string | boolean) => setLead(previous => ({ ...previous, [field]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) { setStep(2); setStatus("idle"); trackEvent("diagnosis_step", { step: 2 }); return; }
    setStatus("loading");
    setMessage("");
    const params = new URLSearchParams(window.location.search);
    const attribution = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].map(key => [key, params.get(key) ?? ""]));
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...lead, attribution, landingPage: window.location.href, website: honeypot.current?.value ?? "", elapsedMs: Date.now() - started.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar agora.");
      setStatus("success");
      trackEvent("lead_submit_success");
      setMessage("Recebemos seus dados. A equipe entrará em contato pelo canal informado.");
    } catch (error) {
      setStatus("error");
      trackEvent("lead_submit_error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar agora. Tente novamente mais tarde.");
    }
  }

  return <section id="diagnostico" className="section diagnosis"><div className="container diagnosis-grid"><div className="diagnosis-copy"><p className="section-label section-label-light"><span className="label-line" aria-hidden="true"></span>PRÓXIMO PASSO</p><h2>Descubra o que pode estar limitando o crescimento da sua oficina.</h2><p>Conte um pouco sobre a sua operação. O diagnóstico parte da sua realidade, sem promessas prontas.</p><div className="diagnosis-aside"><span>01 — ENTENDER</span><span>02 — CONVERSAR</span><span>03 — PLANEJAR</span></div></div><div className="form-panel"><div className="form-progress"><span>DIAGNÓSTICO</span><span>ETAPA 0{step} DE 02</span></div><div className="progress-track"><span style={{ width: step === 1 ? "50%" : "100%" }} /></div>{status === "success" ? <div className="success-panel" role="status"><span aria-hidden="true">↗</span><h3>Solicitação recebida.</h3><p>{message}</p></div> : <form onSubmit={submit}><div className="trap" aria-hidden="true"><label htmlFor="website">Não preencha este campo</label><input ref={honeypot} id="website" name="website" tabIndex={-1} autoComplete="off" /></div>{step === 1 ? <><h3>Primeiro, sua oficina.</h3><p className="form-intro">Isso ajuda a entender onde vale olhar com mais atenção.</p><label>Qual é sua principal dificuldade?<select value={lead.difficulty} onChange={e => update("difficulty", e.target.value)} required><option value="">Selecione uma opção</option><option>Conseguir mais contatos qualificados</option><option>Transformar contatos em agendamentos</option><option>Organizar o atendimento e o acompanhamento</option><option>Entender os resultados do marketing</option><option>Outra</option></select></label><div className="form-row"><label>Seu cargo ou função<input value={lead.role} onChange={e => update("role", e.target.value)} required maxLength={80} placeholder="Ex.: proprietário(a)" /></label><label>Quantidade de unidades<select value={lead.units} onChange={e => update("units", e.target.value)} required><option value="">Selecione</option><option value="1">1 unidade</option><option value="2-3">2 a 3 unidades</option><option value="4+">4 ou mais</option></select></label></div><label>Cidade / UF<input value={lead.city} onChange={e => update("city", e.target.value)} required maxLength={100} placeholder="Ex.: Campinas / SP" /></label><button className="button button-dark form-button" type="submit">Continuar <span aria-hidden="true">→</span></button></> : <><h3>Agora, como falar com você.</h3><p className="form-intro">Usaremos estes dados apenas para responder à sua solicitação.</p><div className="form-row"><label>Seu nome<input value={lead.name} onChange={e => update("name", e.target.value)} required maxLength={100} autoComplete="name" /></label><label>Nome da empresa<input value={lead.company} onChange={e => update("company", e.target.value)} required maxLength={120} autoComplete="organization" /></label></div><div className="form-row"><label>WhatsApp com DDD<input type="tel" inputMode="tel" value={lead.phone} onChange={e => update("phone", e.target.value)} required pattern="[0-9()+.\\s-]{10,20}" title="Informe um telefone com DDD" maxLength={20} autoComplete="tel" placeholder="(11) 99999-9999" /></label><label>E-mail<input type="email" value={lead.email} onChange={e => update("email", e.target.value)} required maxLength={160} autoComplete="email" /></label></div><label className="consent"><input type="checkbox" checked={lead.consent} onChange={e => update("consent", e.target.checked)} required /><span>Concordo em ser contatado sobre este diagnóstico pelos canais informados. {process.env.NEXT_PUBLIC_PRIVACY_URL ? <a href={process.env.NEXT_PUBLIC_PRIVACY_URL} target="_blank" rel="noopener noreferrer">Leia a política de privacidade.</a> : "A política de privacidade ainda não foi publicada."}</span></label><div className="form-actions"><button className="back-button" type="button" onClick={() => setStep(1)}>← Voltar</button><button className="button button-dark" type="submit" disabled={status === "loading"}>{status === "loading" ? "Enviando…" : "Solicitar diagnóstico"} <span aria-hidden="true">↗</span></button></div></>}{status === "error" ? <p className="form-error" role="alert">{message}</p> : null}</form>}<p className="form-footnote">O envio depende da configuração do canal de recebimento. Nenhum dado será armazenado neste site sem essa integração.</p></div></div></section>;
}
