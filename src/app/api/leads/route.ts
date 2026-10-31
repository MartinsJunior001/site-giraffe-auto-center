import { sendLead, validateLead } from "@/lib/lead-service";

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_PRIVACY_URL) return Response.json({ message: "O canal de diagnóstico aguarda a política de privacidade e a configuração de recebimento." }, { status: 503 });
  if (Number(request.headers.get("content-length") ?? 0) > 10000) return Response.json({ message: "Dados inválidos." }, { status: 413 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ message: "Dados inválidos." }, { status: 400 }); }
  if (!validateLead(payload)) return Response.json({ message: "Revise os campos e tente novamente." }, { status: 400 });
  if (payload.website || payload.elapsedMs < 2000) return Response.json({ message: "Solicitação não aceita." }, { status: 400 });
  try {
    const result = await sendLead(payload);
    if (result.unavailable) return Response.json({ message: "O envio ainda não está configurado. Tente novamente quando o canal de atendimento estiver disponível." }, { status: 503 });
    if (!result.ok) return Response.json({ message: "Não foi possível enviar agora. Tente novamente mais tarde." }, { status: 502 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ message: "Não foi possível enviar agora. Tente novamente mais tarde." }, { status: 502 });
  }
}
