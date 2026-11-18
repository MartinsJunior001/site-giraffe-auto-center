// Monta o card do Pipefy a partir do lead do site e faz a entrega com proteção contra duplicidade.
// Só imports de tipo: os testes isolados (tests/*.test.mjs) carregam este arquivo direto no Node.
import type { PipefyClient, PipefyError, PipefyFieldIds, PipefyFieldValue } from "./pipefy";

// Sem import de runtime de ./pipefy (o Node não resolve o caminho sem extensão): reconhece o erro pelo nome.
function isPipefyError(error: unknown): error is PipefyError {
  return error instanceof Error && error.name === "PipefyError" && typeof (error as PipefyError).reason === "string";
}

export type LeadForPipefy = {
  leadId: string;
  /** Textos das opções exatamente como estão no Pipefy (traduzidos em src/content/pipefy.ts). */
  roleOption: string;
  revenueOption: string;
  name: string; email: string; phone: string; company: string;
  landingPage: string;
  utm: { source: string; medium: string; campaign: string; content: string; term: string };
  submittedAt: Date;
};

/** WhatsApp com código do país, como o Pipefy pede para o campo de telefone: "(11) 99999-9999" vira "+5511999999999". */
export function pipefyPhone(phone: string) {
  return `+55${phone.replace(/\D/g, "")}`;
}

/** Origem completa, uma informação por linha, sem cortes (o campo do Pipefy é texto longo). */
export function originText(lead: LeadForPipefy) {
  const utm = Object.entries(lead.utm).filter(([, value]) => value).map(([key, value]) => `utm_${key}: ${value}`);
  return [...(utm.length ? utm : ["Sem parâmetros UTM no link de acesso"]), `Página: ${lead.landingPage}`].join("\n");
}

/** Card com os campos do formulário inicial. Papel, nome, e-mail e WhatsApp são obrigatórios no mapeamento; os demais entram se tiverem ID. */
export function buildPipefyCard(lead: LeadForPipefy, ids: PipefyFieldIds): { title: string; fields: PipefyFieldValue[] } {
  const fields: PipefyFieldValue[] = [
    { field_id: ids.role, field_value: lead.roleOption },
    { field_id: ids.name, field_value: lead.name },
    { field_id: ids.email, field_value: lead.email },
    { field_id: ids.phone, field_value: pipefyPhone(lead.phone) },
  ];
  if (ids.company) fields.push({ field_id: ids.company, field_value: lead.company });
  if (ids.revenue) fields.push({ field_id: ids.revenue, field_value: lead.revenueOption });
  if (ids.origin) fields.push({ field_id: ids.origin, field_value: originText(lead) });
  if (ids.leadId) fields.push({ field_id: ids.leadId, field_value: lead.leadId });
  return { title: `${lead.company} · ${lead.name}`.slice(0, 255), fields };
}

/**
 * Comentário do card: registra quando e como o lead chegou (data, aceite e ID do envio), sem repetir dados pessoais
 * que já estão nos campos. Um dado só entra aqui se o mapeamento não tiver campo para ele, para nada se perder.
 */
export function buildPipefySummary(lead: LeadForPipefy, ids: PipefyFieldIds) {
  const local = lead.submittedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const missing = [
    !ids.company && `Oficina: ${lead.company}`,
    !ids.revenue && `Faturamento mensal: ${lead.revenueOption}`,
    !ids.origin && `Origem:\n${originText(lead)}`,
    !ids.leadId && `ID do envio: ${lead.leadId}`,
  ].filter(Boolean);
  return [
    "Lead recebido pelo formulário de diagnóstico do site Giraffe Assessoria.",
    `Enviado em: ${local} (horário de Brasília)`,
    "Consentimento: o visitante aceitou o contato no formulário.",
    ...(ids.leadId ? [`ID do envio: ${lead.leadId}`] : []),
    ...missing,
  ].join("\n");
}

export type PipefyDelivery =
  | { ok: true; cardId: string; duplicate: boolean; commentSaved: boolean; commentReason?: string }
  | { ok: false; reason: string };

export type DeliverOptions = {
  /** Novas tentativas de criar o card depois da primeira. */
  retries?: number;
  retryDelayMs?: number;
  /** Prazo total; passado dele, não começa outra tentativa. */
  deadlineMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

/**
 * Cria o card e confirma o ID devolvido pelo Pipefy. Só responde ok com o ID do card em mãos.
 *
 * Duplicidade: com o campo do leadId no mapeamento (src/content/pipefy.ts), procura o leadId no pipe antes de criar.
 * Uma falha que possa ter criado o card (tempo esgotado, queda de conexão, 500/504) nunca é repetida, nem com o campo:
 * o pedido pode terminar no Pipefy depois do nosso prazo, e uma nova criação viraria um card duplicado. Nesse caso
 * a busca pelo leadId confirma o card se ele já apareceu; se não, o visitante recebe erro e, no reenvio com o mesmo
 * leadId, a busca antes de criar encontra o card que tiver chegado atrasado.
 * Só falhas que comprovadamente não chegaram ao Pipefy (token, 429, 502, 503) são repetidas.
 */
export async function deliverLeadToPipefy(client: PipefyClient, lead: LeadForPipefy, ids: PipefyFieldIds, options: DeliverOptions = {}): Promise<PipefyDelivery> {
  const retries = options.retries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 600;
  const deadlineMs = options.deadlineMs ?? 15000;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const startedAt = now();

  async function existingCard(): Promise<string | null> {
    if (!ids.leadId) return null;
    return client.findCardIdByField(ids.leadId, lead.leadId).catch(() => null);
  }

  const before = await existingCard();
  if (before) return { ok: true, cardId: before, duplicate: true, commentSaved: false };

  const card = buildPipefyCard(lead, ids);
  let cardId: string | null = null;
  for (let attempt = 0; cardId === null; attempt++) {
    try {
      cardId = (await client.createCard(card)).id;
    } catch (error) {
      if (!isPipefyError(error)) return { ok: false, reason: "erro-inesperado" };
      const canRetry = error.retryable && attempt < retries && now() - startedAt < deadlineMs;
      if (error.maybeProcessed) {
        const found = await existingCard();
        if (found) return { ok: true, cardId: found, duplicate: true, commentSaved: false };
        return { ok: false, reason: error.reason };
      }
      if (!canRetry) return { ok: false, reason: error.reason };
      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  // O card já existe: o comentário é um complemento e a falha dele não desfaz o envio.
  try {
    await client.createComment(cardId, buildPipefySummary(lead, ids));
    return { ok: true, cardId, duplicate: false, commentSaved: true };
  } catch (error) {
    return { ok: true, cardId, duplicate: false, commentSaved: false, commentReason: isPipefyError(error) ? error.reason : "erro-inesperado" };
  }
}
