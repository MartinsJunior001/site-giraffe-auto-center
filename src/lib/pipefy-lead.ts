// Monta o card do Pipefy a partir do lead do site e faz a entrega com proteção contra duplicidade.
// Só imports de tipo: os testes isolados (tests/*.test.mjs) carregam este arquivo direto no Node.
import type { PipefyClient, PipefyError, PipefyFieldIds, PipefyFieldValue } from "./pipefy";

// Sem import de runtime de ./pipefy (o Node não resolve o caminho sem extensão): reconhece o erro pelo nome.
function isPipefyError(error: unknown): error is PipefyError {
  return error instanceof Error && error.name === "PipefyError" && typeof (error as PipefyError).reason === "string";
}

export type LeadForPipefy = {
  leadId: string;
  /** Texto da opção de papel exatamente como está no campo do Pipefy. */
  roleOption: string;
  roleLabel: string;
  revenueLabel: string;
  name: string; email: string; phone: string; company: string;
  landingPage: string;
  utm: { source: string; medium: string; campaign: string; content: string; term: string };
  submittedAt: Date;
};

/** WhatsApp com código do país, como o Pipefy pede para o campo de telefone: "(11) 99999-9999" vira "+5511999999999". */
export function pipefyPhone(phone: string) {
  return `+55${phone.replace(/\D/g, "")}`;
}

function originText(lead: LeadForPipefy) {
  const utm = Object.entries(lead.utm).filter(([, value]) => value).map(([key, value]) => `utm_${key}=${value}`);
  return [...utm, `página=${lead.landingPage}`].join(" | ");
}

/** Card com os quatro campos do formulário inicial e, se houver campos no Pipefy para eles, os dados complementares. */
export function buildPipefyCard(lead: LeadForPipefy, ids: PipefyFieldIds): { title: string; fields: PipefyFieldValue[] } {
  const fields: PipefyFieldValue[] = [
    { field_id: ids.role, field_value: lead.roleOption },
    { field_id: ids.name, field_value: lead.name },
    { field_id: ids.email, field_value: lead.email },
    { field_id: ids.phone, field_value: pipefyPhone(lead.phone) },
  ];
  if (ids.company) fields.push({ field_id: ids.company, field_value: lead.company });
  if (ids.revenue) fields.push({ field_id: ids.revenue, field_value: lead.revenueLabel });
  if (ids.origin) fields.push({ field_id: ids.origin, field_value: originText(lead).slice(0, 255) });
  if (ids.leadId) fields.push({ field_id: ids.leadId, field_value: lead.leadId });
  return { title: `${lead.company} · ${lead.name}`.slice(0, 255), fields };
}

/**
 * Comentário com tudo o que o formulário coletou. O formulário inicial do Pipefy só tem papel, nome, e-mail e WhatsApp;
 * o comentário guarda no card a oficina, o faturamento, a origem (UTMs e página) e o ID do envio, sem descartar nada.
 */
export function buildPipefySummary(lead: LeadForPipefy) {
  const local = lead.submittedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const utm = Object.entries(lead.utm).map(([key, value]) => `utm_${key}: ${value || "-"}`);
  return [
    "Lead do site Giraffe Assessoria (formulário de diagnóstico)",
    `Oficina: ${lead.company}`,
    `Papel: ${lead.roleLabel}`,
    `Faturamento mensal: ${lead.revenueLabel}`,
    `Nome: ${lead.name}`,
    `E-mail: ${lead.email}`,
    `WhatsApp: ${lead.phone}`,
    ...utm,
    `Página: ${lead.landingPage}`,
    `Enviado em: ${local} (horário de Brasília)`,
    `ID do envio: ${lead.leadId}`,
    "Consentimento: aceito no formulário",
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
 * Duplicidade: com PIPEFY_FIELD_LEAD_ID configurado, procura o leadId no pipe antes de criar e antes de repetir uma
 * tentativa que possa ter chegado ao Pipefy. Sem esse campo, uma falha que possa ter criado o card (tempo esgotado,
 * queda de conexão, 500/504) não é repetida: o visitante recebe erro e o mesmo leadId vale para o reenvio.
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
        if (!ids.leadId) return { ok: false, reason: error.reason };
      }
      if (!canRetry) return { ok: false, reason: error.reason };
      await sleep(retryDelayMs * 2 ** attempt);
    }
  }

  // O card já existe: o comentário é um complemento e a falha dele não desfaz o envio.
  try {
    await client.createComment(cardId, buildPipefySummary(lead));
    return { ok: true, cardId, duplicate: false, commentSaved: true };
  } catch (error) {
    return { ok: true, cardId, duplicate: false, commentSaved: false, commentReason: isPipefyError(error) ? error.reason : "erro-inesperado" };
  }
}
