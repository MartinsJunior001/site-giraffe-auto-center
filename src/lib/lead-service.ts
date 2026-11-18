import { revenueOptions, roleOptions } from "@/content/diagnosis";
import { createPipefyClient, pipefyConfigFromEnv, pipefyFieldIdsFromEnv, type PipefyClient } from "@/lib/pipefy";
import { deliverLeadToPipefy } from "@/lib/pipefy-lead";

export type LeadPayload = {
  leadId: string;
  role: string; revenue: string;
  name: string; email: string; phone: string; company: string;
  consent: boolean; attribution: Record<string, string>; landingPage: string;
  website: string; elapsedMs: number;
};

export type SendResult =
  | { ok: true; destination: "pipefy" | "make"; cardId?: string; duplicate?: boolean; commentSaved?: boolean; commentReason?: string }
  | { ok: false; unavailable: true }
  | { ok: false; unavailable: false; reason: string };

const roles: readonly string[] = roleOptions.map(option => option.value);
const revenues: readonly string[] = revenueOptions.map(option => option.value);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** O Make responde em poucos segundos; 20 s cobre a gravação na planilha sem prender o visitante demais. */
const WEBHOOK_TIMEOUT_MS = 20000;

export function validateLead(value: unknown): value is LeadPayload {
  if (!value || typeof value !== "object") return false;
  const lead = value as Record<string, unknown>;
  if (typeof lead.leadId !== "string" || !UUID.test(lead.leadId)) return false;
  const fields: Record<string, number> = { role: 40, revenue: 20, name: 100, email: 160, phone: 20, company: 120 };
  if (!Object.entries(fields).every(([key, max]) => typeof lead[key] === "string" && (lead[key] as string).trim().length > 0 && (lead[key] as string).length <= max)) return false;
  if (!roles.includes(lead.role as string) || !revenues.includes(lead.revenue as string)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email as string)) return false;
  const digits = (lead.phone as string).replace(/\D/g, "").length;
  if (digits < 10 || digits > 11) return false;
  return lead.consent === true && typeof lead.website === "string" && typeof lead.elapsedMs === "number" && lead.attribution !== null && typeof lead.attribution === "object" && typeof lead.landingPage === "string" && lead.landingPage.length <= 2000;
}

function utm(attribution: Record<string, string>, key: (typeof UTM_KEYS)[number]) {
  const value = attribution[key];
  return typeof value === "string" ? value.slice(0, 200) : "";
}

/** Destino dos leads: o Pipefy quando PIPEFY_CLIENT_ID está definido; senão, o webhook do Make (LEAD_WEBHOOK_URL). */
export function leadDestination(env: Record<string, string | undefined> = process.env): "pipefy" | "make" | null {
  if (env.PIPEFY_CLIENT_ID?.trim()) return "pipefy";
  if (env.LEAD_WEBHOOK_URL) return "make";
  return null;
}

export async function sendLead(lead: LeadPayload): Promise<SendResult> {
  const destination = leadDestination();
  if (destination === "pipefy") return sendLeadToPipefy(lead);
  if (destination === "make") return sendLeadToMake(lead);
  return { ok: false, unavailable: true };
}

// Um cliente por processo, para reaproveitar o token entre os envios. É recriado se a configuração mudar.
let pipefyClient: { key: string; client: PipefyClient } | null = null;

/**
 * Cria o card no funil Comercial do Pipefy (PIPEFY_PIPE_ID) e confirma o ID devolvido.
 * Os IDs dos campos vêm de PIPEFY_FIELD_*; sem os quatro obrigatórios, nada é enviado e a rota responde erro.
 */
async function sendLeadToPipefy(lead: LeadPayload): Promise<SendResult> {
  const config = pipefyConfigFromEnv();
  if (!config) return { ok: false, unavailable: false, reason: "pipefy-configuracao-incompleta" };
  const ids = pipefyFieldIdsFromEnv();
  if (!ids) return { ok: false, unavailable: false, reason: "pipefy-mapeamento-incompleto" };
  if (process.env.NODE_ENV === "production" && (!config.tokenUrl.startsWith("https://") || !config.apiUrl.startsWith("https://"))) return { ok: false, unavailable: false, reason: "pipefy-sem-https" };

  const key = [config.pipeId, config.clientId, config.tokenUrl, config.apiUrl].join("|");
  if (pipefyClient?.key !== key) pipefyClient = { key, client: createPipefyClient(config) };

  const role = roleOptions.find(option => option.value === lead.role);
  const revenueLabel = revenueOptions.find(option => option.value === lead.revenue)?.label ?? lead.revenue;
  const result = await deliverLeadToPipefy(pipefyClient.client, {
    leadId: lead.leadId,
    // Texto enviado ao campo de papel do Pipefy: a mesma frase que o visitante escolheu no site.
    // A consulta de leitura confere se essas frases existem como opções no Pipefy antes da ativação.
    roleOption: role?.label ?? lead.role,
    roleLabel: role?.label ?? lead.role,
    revenueLabel,
    name: lead.name.trim(),
    email: lead.email.trim(),
    phone: lead.phone,
    company: lead.company.trim(),
    landingPage: lead.landingPage,
    utm: { source: utm(lead.attribution, "utm_source"), medium: utm(lead.attribution, "utm_medium"), campaign: utm(lead.attribution, "utm_campaign"), content: utm(lead.attribution, "utm_content"), term: utm(lead.attribution, "utm_term") },
    submittedAt: new Date(),
  }, ids);
  if (!result.ok) return { ok: false, unavailable: false, reason: result.reason };
  return { ok: true, destination: "pipefy", cardId: result.cardId, duplicate: result.duplicate, commentSaved: result.commentSaved, commentReason: result.commentReason };
}

/**
 * Envia o lead ao webhook do Make (LEAD_WEBHOOK_URL), sempre pelo servidor.
 *
 * O cenário no Make é: Custom Webhook → Google Sheets "Add a row" → Webhook Response com status 200 e o corpo
 * {"ok": true, "leadId": "<leadId recebido>"}. Só essa resposta conta como gravado. Um "200 Accepted" (cenário sem
 * resposta, agendado ou que passou de 180 s) não confirma a planilha e é tratado como falha; se a planilha der erro,
 * o Make responde 500.
 *
 * Com LEAD_WEBHOOK_TOKEN, a chave vai no cabeçalho x-make-apikey (autenticação por chave de API do webhook do Make).
 */
async function sendLeadToMake(lead: LeadPayload): Promise<SendResult> {
  const endpoint = process.env.LEAD_WEBHOOK_URL;
  if (!endpoint) return { ok: false, unavailable: true };
  if (process.env.NODE_ENV === "production" && !endpoint.startsWith("https://")) return { ok: false, unavailable: false, reason: "webhook-sem-https" };

  const submittedAt = new Date();
  const revenueLabel = revenueOptions.find(option => option.value === lead.revenue)?.label ?? lead.revenue;
  const body = {
    leadId: lead.leadId,
    submittedAt: submittedAt.toISOString(),
    submittedAtLocal: submittedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    name: lead.name.trim(),
    phone: lead.phone,
    email: lead.email.trim(),
    company: lead.company.trim(),
    role: lead.role,
    revenue: lead.revenue,
    revenueLabel,
    landingPage: lead.landingPage,
    utmSource: utm(lead.attribution, "utm_source"),
    utmMedium: utm(lead.attribution, "utm_medium"),
    utmCampaign: utm(lead.attribution, "utm_campaign"),
    utmContent: utm(lead.attribution, "utm_content"),
    utmTerm: utm(lead.attribution, "utm_term"),
    consent: lead.consent,
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(process.env.LEAD_WEBHOOK_TOKEN ? { "x-make-apikey": process.env.LEAD_WEBHOOK_TOKEN } : {}) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, unavailable: false, reason: error instanceof Error && error.name === "TimeoutError" ? "tempo-esgotado" : "falha-de-rede" };
  }
  if (!response.ok) return { ok: false, unavailable: false, reason: `http-${response.status}` };
  const confirmation = await response.json().catch(() => null) as { ok?: unknown; leadId?: unknown } | null;
  if (!confirmation || confirmation.ok !== true || confirmation.leadId !== lead.leadId) return { ok: false, unavailable: false, reason: "sem-confirmacao-da-planilha" };
  return { ok: true, destination: "make" };
}
