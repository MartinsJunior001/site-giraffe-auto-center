import { sendLead, validateLead } from "@/lib/lead-service";

// Modo de teste: só no `next dev` e só enquanto LEAD_WEBHOOK_URL não estiver configurado.
// Valida os dados normalmente, não envia para lugar nenhum e responde sucesso para permitir testar o fluxo até /obrigado.
// Em produção (next build/start) este atalho não existe: sem webhook e política, a rota responde 503.
const devTestMode = process.env.NODE_ENV === "development" && !process.env.LEAD_WEBHOOK_URL;

export async function POST(request: Request) {
  if (!devTestMode && !process.env.NEXT_PUBLIC_PRIVACY_URL) return Response.json({ message: "O canal de diagnóstico aguarda a política de privacidade e a configuração de recebimento." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 10000) return Response.json({ message: "Dados inválidos." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ message: "Dados inválidos." }, { status: 400 }); }
  if (!validateLead(payload)) return Response.json({ message: "Revise os campos e tente novamente." }, { status: 400 });
  if (payload.website || payload.elapsedMs < 2000) return Response.json({ message: "Solicitação não aceita." }, { status: 400 });
  if (devTestMode) {
    console.info(`[leads] modo de teste: formulário válido (função: ${payload.role}, faturamento: ${payload.revenue}); nada foi enviado porque LEAD_WEBHOOK_URL não está configurado.`);
    return Response.json({ ok: true, test: true });
  }
  try {
    const result = await sendLead(payload);
    if (result.unavailable) return Response.json({ message: "O envio ainda não está configurado. Tente novamente quando o canal de atendimento estiver disponível." }, { status: 503 });
    if (!result.ok) return Response.json({ message: "Não foi possível enviar agora. Tente novamente mais tarde." }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "Não foi possível enviar agora. Tente novamente mais tarde." }, { status: 502 });
  }
}
