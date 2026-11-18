import { privacyPolicyComplete } from "@/content/privacy";
import { leadDestination, sendLead, validateLead } from "@/lib/lead-service";

// Modo de teste: só no `next dev` e só enquanto nenhum destino (Pipefy ou webhook do Make) estiver configurado.
// Valida os dados normalmente, não envia para lugar nenhum e responde sucesso para permitir testar o fluxo até /obrigado.
// Em produção ele nunca vale: sem destino, a rota responde 503 e o visitante não vê sucesso falso.
const devTestMode = process.env.NODE_ENV === "development" && leadDestination() === null;

// Em produção, sem a política de privacidade completa (src/content/privacy.ts) a rota responde 503 e nenhum dado é
// recebido. No `next dev` a trava não se aplica, para permitir o teste real com o webhook antes da publicação.
const privacyBlocked = process.env.NODE_ENV === "production" && !privacyPolicyComplete;

// Proteção contra envios duplicados: cada abertura do formulário gera um leadId. Um leadId já gravado não é
// reenviado (a rota confirma de novo), e um envio em andamento com o mesmo leadId não é repetido.
// Fica na memória do servidor (uma instância). Segunda barreira: no Pipefy, a busca do leadId no pipe (PIPEFY_FIELD_LEAD_ID);
// no Make, a conferência do leadId na planilha.
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;
const delivered = new Map<string, number>();
const inFlight = new Set<string>();

function rememberDelivered(leadId: string) {
  const now = Date.now();
  for (const [id, at] of delivered) if (now - at > DUPLICATE_WINDOW_MS) delivered.delete(id);
  delivered.set(leadId, now);
}

export async function POST(request: Request) {
  if (privacyBlocked) return Response.json({ message: "O canal de diagnóstico aguarda a política de privacidade e a configuração de recebimento." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 10000) return Response.json({ message: "Dados inválidos." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ message: "Dados inválidos." }, { status: 400 }); }
  if (!validateLead(payload)) return Response.json({ message: "Revise os campos e tente novamente." }, { status: 400 });
  if (payload.website || payload.elapsedMs < 2000) return Response.json({ message: "Solicitação não aceita." }, { status: 400 });
  if (devTestMode) {
    console.info(`[leads] modo de teste: formulário válido (função: ${payload.role}, faturamento: ${payload.revenue}); nada foi enviado porque nenhum destino (PIPEFY_* ou LEAD_WEBHOOK_URL) está configurado.`);
    return Response.json({ ok: true, test: true });
  }

  const { leadId } = payload;
  const deliveredAt = delivered.get(leadId);
  if (deliveredAt && Date.now() - deliveredAt <= DUPLICATE_WINDOW_MS) return Response.json({ ok: true, duplicate: true });
  if (inFlight.has(leadId)) return Response.json({ message: "Seu envio já está sendo processado. Aguarde um instante." }, { status: 409 });

  inFlight.add(leadId);
  try {
    const result = await sendLead(payload);
    if (result.ok) {
      rememberDelivered(leadId);
      if (result.destination === "pipefy") {
        // Só IDs técnicos no log: o card e o começo do leadId. Nada de nome, e-mail ou telefone.
        console.info(`[leads] card ${result.cardId} ${result.duplicate ? "já existia" : "criado"} no Pipefy; lead ${leadId.slice(0, 8)}`);
        if (!result.duplicate && !result.commentSaved) console.warn(`[leads] card ${result.cardId}: comentário com os dados complementares não foi criado (${result.commentReason})`);
      }
      return Response.json(result.duplicate ? { ok: true, duplicate: true } : { ok: true });
    }
    if (result.unavailable) return Response.json({ message: "O envio ainda não está configurado. Tente novamente quando o canal de atendimento estiver disponível." }, { status: 503 });
    // Só o motivo técnico vai para o log: sem dados pessoais, sem a URL do webhook e sem credenciais.
    console.error(`[leads] ${leadDestination() === "pipefy" ? "o Pipefy" : "o webhook"} não confirmou o registro (${result.reason}); lead ${leadId.slice(0, 8)}`);
    return Response.json({ message: "Não foi possível enviar agora. Tente novamente em instantes." }, { status: 502 });
  } finally {
    inFlight.delete(leadId);
  }
}
