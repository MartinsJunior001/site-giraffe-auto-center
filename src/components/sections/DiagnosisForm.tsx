"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/icons/UiIcon";
import { revenueOptions, roleOptions, thankYouPath, whatsappUrl } from "@/content/diagnosis";
import { privacyPolicyComplete, privacyPolicyPath } from "@/content/privacy";
import { trackEvent } from "@/lib/analytics";

// Em produção, enquanto a política de privacidade não estiver completa (src/content/privacy.ts, que inclui o destino
// dos contatos), o formulário não envia nada: o visitante vê um aviso de indisponibilidade e nenhum dado sai do navegador.
// A rota /api/leads mantém a mesma trava no servidor. No `next dev` o fluxo continua testável.
const submissionsEnabled = process.env.NODE_ENV !== "production" || privacyPolicyComplete;
const whatsappLink = whatsappUrl();

type Lead = { role: string; revenue: string; name: string; email: string; phone: string; company: string };
const initial: Lead = { role: "", revenue: "", name: "", email: "", phone: "", company: "" };
const TOTAL_STEPS = 4;

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function Stepper({ step }: { step: number }) {
  return <div className="lead-stepper">
    <div className="lead-progress" aria-hidden="true"><span style={{ width: `${((step - 1) / TOTAL_STEPS) * 100 + 100 / TOTAL_STEPS / 2}%` }} /></div>
    <ol className="lead-steps" aria-hidden="true">
      {Array.from({ length: TOTAL_STEPS }, (_, index) => {
        const number = index + 1;
        const state = number < step ? "is-done" : number === step ? "is-current" : "";
        return <li key={number} className={state}>
          <span className="lead-step-dot">{number < step ? <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg> : number}</span>
        </li>;
      })}
    </ol>
    <p className="lead-step-count">Etapa 0{step} de 0{TOTAL_STEPS}</p>
  </div>;
}

function ChoiceList({ name, options, value, onPick }: { name: string; options: readonly { value: string; label: string }[]; value: string; onPick: (value: string) => void }) {
  return <div className="lead-choices" role="group" aria-labelledby={`${name}-title`}>
    {options.map(option => (
      <button key={option.value} type="button" className={`lead-choice${value === option.value ? " is-selected" : ""}`} aria-pressed={value === option.value} onClick={() => onPick(option.value)}>
        <span className="lead-choice-radio" aria-hidden="true" />
        {option.label}
      </button>
    ))}
  </div>;
}

export function DiagnosisForm() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const stepRef = useRef<HTMLDivElement>(null);
  const stepChanged = useRef(false);
  const openedAt = useRef(0);
  // Identificador deste envio: o mesmo em novas tentativas, para o servidor e a planilha não duplicarem o lead.
  const leadId = useRef("");
  const previousOverflow = useRef("");
  const [lead, setLead] = useState<Lead>(initial);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "unavailable">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (dialogRef.current?.open) document.body.style.overflow = previousOverflow.current;
  }, []);

  useEffect(() => {
    if (!stepChanged.current) return;
    stepChanged.current = false;
    stepRef.current?.querySelector<HTMLElement>("input, h3")?.focus();
  }, [step]);

  const update = (field: keyof Lead, value: string) => setLead(previous => ({ ...previous, [field]: value }));

  function goTo(next: number) {
    stepChanged.current = true;
    setStep(next);
    setStatus("idle");
    trackEvent("diagnosis_step", { step: next });
    dialogRef.current?.querySelector(".lead-dialog-panel")?.scrollTo({ top: 0 });
  }

  function open(source = "card") {
    if (!dialogRef.current || dialogRef.current.open) return;
    if (!openedAt.current) openedAt.current = Date.now();
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current.showModal();
    trackEvent("diagnosis_open", { step, source });
  }

  // Todo link para #diagnostico (topo, menu móvel, seções, rodapé) abre este modal.
  // Sem JavaScript, o link continua levando até a seção.
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; });
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a[href="#diagnostico"]');
      if (!link) return;
      event.preventDefault();
      openRef.current(link.getAttribute("data-cta") || link.className.split(" ")[0] || "link");
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  function close() {
    dialogRef.current?.close();
  }

  function pick(field: "role" | "revenue", value: string) {
    update(field, value);
    goTo(step + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionsEnabled) { setStatus("unavailable"); trackEvent("lead_submit_unavailable"); return; }
    if (step === 3) { goTo(4); return; }
    setStatus("loading");
    setMessage("");
    const params = new URLSearchParams(window.location.search);
    if (!leadId.current) leadId.current = crypto.randomUUID();
    const attribution = Object.fromEntries(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].map(key => [key, params.get(key) ?? ""]));
    try {
      const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...lead, leadId: leadId.current, consent: true, attribution, landingPage: window.location.href, website: honeypot.current?.value ?? "", elapsedMs: Date.now() - openedAt.current }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Não foi possível enviar agora. Tente novamente em instantes.");
      trackEvent("lead_submit_success");
      router.push(thankYouPath);
    } catch (error) {
      setStatus("error");
      trackEvent("lead_submit_error");
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar agora. Tente novamente em instantes.");
    }
  }


  return <>
    <button className="button button-orange diagnosis-card-button" type="button" onClick={() => open("card")} aria-haspopup="dialog">Quero meu diagnóstico <UiIcon name="up-right" /></button>
    <dialog ref={dialogRef} className="lead-dialog" aria-labelledby="lead-title" onClose={() => { document.body.style.overflow = previousOverflow.current; }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="lead-dialog-panel">
        <button className="lead-close" type="button" onClick={close} aria-label="Fechar formulário"><UiIcon name="close" /></button>
        <p className="lead-label"><span className="label-line" aria-hidden="true"></span>DIAGNÓSTICO GIRAFFE</p>
        <h2 id="lead-title">Sua oficina pode <span>atrair mais clientes</span>. Vamos conversar?</h2>
        <p className="lead-subtitle">Responda 4 etapas rápidas para nossa equipe conhecer sua oficina e entender como podemos ajudar.</p>
        <Stepper step={step} />
        <form onSubmit={submit}>
          <div className="trap" aria-hidden="true"><label htmlFor="lead-website">Não preencha este campo</label><input ref={honeypot} id="lead-website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <div className="lead-step" ref={stepRef}>
            {step === 1 ? <>
              <h3 id="role-title" tabIndex={-1}>Qual é o seu papel na oficina?</h3>
              <p className="lead-hint">Queremos conhecer melhor você e sua empresa.</p>
              <ChoiceList name="role" options={roleOptions} value={lead.role} onPick={value => pick("role", value)} />
            </> : null}
            {step === 2 ? <>
              <h3 id="revenue-title" tabIndex={-1}>Quanto sua oficina fatura por mês, em média?</h3><p className="lead-hint">Isso nos ajuda a entender o tamanho do seu negócio.</p>
              <ChoiceList name="revenue" options={revenueOptions} value={lead.revenue} onPick={value => pick("revenue", value)} />
              <div className="lead-actions"><button className="lead-back" type="button" onClick={() => goTo(1)}><UiIcon name="left" /> Voltar</button></div>
            </> : null}
            {step === 3 ? <>
              <h3 tabIndex={-1}>Como podemos falar com você?</h3>
              <p className="lead-hint">Falta pouco! Deixe seus dados para nossa equipe entrar em contato.</p>
              <label className="lead-field">Seu nome<input value={lead.name} onChange={e => update("name", e.target.value)} required maxLength={100} autoComplete="name" placeholder="Seu nome completo" /></label>
              <label className="lead-field">Seu melhor e-mail<input type="email" value={lead.email} onChange={e => update("email", e.target.value)} required maxLength={160} autoComplete="email" placeholder="voce@suaoficina.com.br" /></label>
              <label className="lead-field">Seu WhatsApp
                <span className="lead-phone"><span className="lead-phone-prefix" aria-hidden="true">+55</span><input type="tel" inputMode="tel" value={lead.phone} onChange={e => update("phone", formatPhone(e.target.value))} required pattern="\(\d{2}\) \d{4,5}-\d{4}" title="Informe o número com DDD, por exemplo (11) 99999-9999" maxLength={15} autoComplete="tel-national" placeholder="(11) 99999-9999" /></span>
              </label>
              <div className="lead-actions"><button className="lead-back" type="button" onClick={() => goTo(2)}><UiIcon name="left" /> Voltar</button><button className="button button-orange lead-submit" type="submit">Continuar <UiIcon name="right" /></button></div>
            </> : null}
            {step === 4 ? <>
              <h3 tabIndex={-1}>Para finalizar, qual é o nome da sua oficina?</h3><p className="lead-hint">Pronto! Agora nossa equipe poderá conhecer melhor sua empresa.</p>
              <label className="lead-field">Nome da oficina<input value={lead.company} onChange={e => update("company", e.target.value)} required maxLength={120} autoComplete="organization" placeholder="Nome da sua oficina" /></label>
              <div className="lead-actions"><button className="lead-back" type="button" onClick={() => goTo(3)} disabled={status === "loading"}><UiIcon name="left" /> Voltar</button><button className="button button-orange lead-submit" type="submit" disabled={status === "loading"}>{status === "loading" ? "Enviando…" : "Solicitar contato da Giraffe"} <UiIcon name="up-right" /></button></div>
            </> : null}
          </div>
          {status === "error" ? <p className="lead-error" role="alert">{message}</p> : null}
          {status === "unavailable" ? <p className="lead-error" role="alert">
            O envio pelo formulário está temporariamente indisponível e seus dados não foram enviados.
            {whatsappLink ? <> Enquanto isso, fale com a equipe da Giraffe pelo <a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</> : null}
          </p> : null}
        </form>
        <p className="lead-footnote">Seus dados serão usados apenas para a equipe da Giraffe entrar em contato com você sobre nossos serviços. Veja nossa <a href={privacyPolicyPath} target="_blank" rel="noopener">Política de Privacidade</a>.</p>
      </div>
    </dialog>
  </>;
}
