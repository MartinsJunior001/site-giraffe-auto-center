// Teste da rota /api/leads de ponta a ponta contra o simulador local (tests/mock-pipefy.mjs). Nada vai para o Pipefy real.
// 1. node tests/mock-pipefy.mjs 4010
// 2. next dev com PIPEFY_* apontando para o simulador (ver o relatório da integração) ou, na fase "make", com LEAD_WEBHOOK_URL
// 3. node tests/leads-route.e2e.mjs http://localhost:3005 http://127.0.0.1:4010 [pipefy|make]
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

const [site = "http://localhost:3005", mock = "http://127.0.0.1:4010", phase = "pipefy"] = process.argv.slice(2);
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(["PASS", name]); console.log(`PASS | ${name}`); }
  catch (error) { results.push(["FAIL", name]); console.log(`FAIL | ${name} | ${error.message.split("\n")[0]}`); }
}
const control = (path, body) => fetch(mock + path, { method: body ? "POST" : "GET", body: body ? JSON.stringify(body) : undefined }).then(r => r.json());
const lead = (extra = {}) => ({
  leadId: randomUUID(), role: "Proprietário", revenue: "40k-60k",
  name: "Cliente Teste E2E", email: "e2e@oficina.test", phone: "(16) 99622-7258", company: "Oficina E2E",
  consent: true, attribution: { utm_source: "google", utm_medium: "cpc", utm_campaign: "teste", utm_content: "", utm_term: "" },
  landingPage: "http://localhost:3005/?utm_source=google", website: "", elapsedMs: 9000, ...extra,
});
const post = async body => {
  const response = await fetch(`${site}/api/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

await control("/__reset", {});

if (phase === "make") {
  await check("Make preservado: sem PIPEFY_*, o lead vai para o webhook e só confirma com {ok, leadId}", async () => {
    const payload = lead();
    const r = await post(payload);
    assert.equal(r.status, 200);
    const state = await control("/__state");
    assert.equal(state.make.length, 1);
    assert.equal(state.make[0].leadId, payload.leadId);
    assert.equal(state.make[0].revenueLabel, "R$ 40 mil a R$ 60 mil/mês");
    assert.equal(state.creates.length, 0);
  });
} else {
  await check("Validação: sem nome → 400 e nenhum card", async () => {
    const r = await post(lead({ name: "" }));
    assert.equal(r.status, 400);
    assert.equal((await control("/__state")).creates.length, 0);
  });
  await check("Validação: WhatsApp com poucos dígitos, e-mail inválido e papel fora da lista → 400", async () => {
    for (const extra of [{ phone: "(16) 9962" }, { email: "sem-arroba" }, { role: "Diretor" }, { revenue: "1-milhao" }, { consent: false }]) assert.equal((await post(lead(extra))).status, 400, JSON.stringify(extra));
    assert.equal((await control("/__state")).creates.length, 0);
  });
  await check("Spam: honeypot preenchido e envio rápido demais → 400", async () => {
    assert.equal((await post(lead({ website: "http://spam" }))).status, 400);
    assert.equal((await post(lead({ elapsedMs: 500 }))).status, 400);
    assert.equal((await control("/__state")).creates.length, 0);
  });

  const first = lead();
  await check("Criação: 200 só depois do card criado, com campos mapeados e comentário completo", async () => {
    const r = await post(first);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
    const state = await control("/__state");
    assert.equal(state.creates.length, 1);
    const q = state.creates[0].query;
    for (const piece of ['pipe_id: 307417378', 'field_id: "f_papel", field_value: "Sou proprietário(a)"', 'field_id: "f_nome", field_value: "Cliente Teste E2E"', 'field_id: "f_email", field_value: "e2e@oficina.test"', 'field_id: "f_whats", field_value: "+5516996227258"', 'title: "Oficina E2E · Cliente Teste E2E"']) assert.ok(q.includes(piece), `faltou ${piece}`);
    assert.equal(state.comments.length, 1);
    for (const piece of ["Oficina E2E", "R$ 40 mil a R$ 60 mil/mês", "utm_source: google", first.leadId]) assert.ok(state.comments[0].includes(piece), `comentário sem ${piece}`);
  });
  await check("Duplicidade: reenvio com o mesmo leadId → 200 duplicate, sem card novo", async () => {
    const r = await post(first);
    assert.equal(r.status, 200);
    assert.equal(r.body.duplicate, true);
    assert.equal((await control("/__state")).creates.length, 1);
  });
  await check("Envios simultâneos com o mesmo leadId criam um só card", async () => {
    const same = lead();
    const rs = await Promise.all([post(same), post(same), post(same)]);
    assert.ok(rs.some(r => r.status === 200));
    assert.ok(rs.every(r => r.status === 200 || r.status === 409));
    assert.equal((await control("/__state")).creates.length, 2);
  });
  await check("Pipefy indisponível (503 em todas as tentativas) → 502, nunca sucesso", async () => {
    await control("/__mode", { create: "503" });
    const before = (await control("/__state")).creates.length;
    const r = await post(lead());
    assert.equal(r.status, 502);
    assert.ok(!r.body.ok);
    assert.equal((await control("/__state")).creates.length - before, 3); // 1 tentativa + 2 novas
  });
  await check("Pipefy recusa os dados (INVALID_INPUT) → 502, sem repetir", async () => {
    await control("/__mode", { create: "invalid" });
    const before = (await control("/__state")).creates.length;
    const r = await post(lead());
    assert.equal(r.status, 502);
    assert.equal((await control("/__state")).creates.length - before, 1);
  });
  await check("Pipefy lento (tempo esgotado) → 502 e nenhuma repetição às cegas", async () => {
    await control("/__mode", { create: "slow" });
    const before = (await control("/__state")).creates.length;
    const r = await post(lead());
    assert.equal(r.status, 502);
    assert.equal((await control("/__state")).creates.length - before, 1);
  });
  await check("Pipefy volta: o mesmo leadId que falhou é aceito no reenvio", async () => {
    await control("/__mode", { create: "503" });
    const retry = lead();
    assert.equal((await post(retry)).status, 502);
    await control("/__mode", { create: "ok" });
    const r = await post(retry);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { ok: true });
  });
  await check("Nenhuma chamada GraphQL saiu sem token válido", async () => {
    assert.equal((await control("/__state")).badAuth, 0);
  });
}

const failed = results.filter(([status]) => status === "FAIL").length;
console.log(`\nTOTAL: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
