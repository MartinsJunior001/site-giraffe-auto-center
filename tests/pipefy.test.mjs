// Testes isolados da integração com o Pipefy: a API é simulada, nada sai da máquina.
// Rodar com: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipefyClient, pipefyConfigFromEnv, PipefyError } from "../src/lib/pipefy.ts";
import { buildPipefyCard, buildPipefySummary, deliverLeadToPipefy, originText, pipefyPhone } from "../src/lib/pipefy-lead.ts";
import { pipefyExpectedTypes, pipefyMapping, pipefyRevenueOptions, pipefyRoleOptions } from "../src/content/pipefy.ts";
import { revenueOptions, roleOptions } from "../src/content/diagnosis.ts";

const SECRET = "segredo-de-teste-nao-vazar";
const config = { pipeId: "303033937", clientId: "cliente-teste", clientSecret: SECRET, tokenUrl: "https://token.test/oauth/token", apiUrl: "https://api.test/graphql" };
// Só os 4 campos obrigatórios do tipo (para testar a entrega sem o campo do leadId) e o mapeamento real completo.
const ids = { role: "papel_id", name: "nome_id", email: "email_id", phone: "whats_id" };
const realIds = pipefyMapping.fields;
const lead = {
  leadId: "3f2b8c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f",
  roleOption: "Sou proprietário (a)", revenueOption: "R$40 mil a R$60 mil/mês",
  name: 'Ana "Teste" Silva', email: "ana@oficina.test", phone: "(16) 99622-7258", company: "Oficina Exemplo",
  landingPage: "https://giraffeassessoria.com.br/?utm_source=google",
  utm: { source: "google", medium: "cpc", campaign: "oficinas", content: "", term: "" },
  submittedAt: new Date("2026-11-17T22:00:00Z"),
};

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const noSleep = async () => {};

/** API simulada: responde o token e encaminha cada consulta GraphQL para o handler do teste. */
function fakePipefy(handler, { tokenStatus = 200, expiresIn = 3600 } = {}) {
  const calls = { token: [], graphql: [] };
  const fetch = async (url, init) => {
    if (url === config.tokenUrl) {
      calls.token.push(init);
      return tokenStatus === 200 ? json(200, { access_token: `tok-${calls.token.length}`, token_type: "Bearer", expires_in: expiresIn }) : json(tokenStatus, { error: "invalid_client" });
    }
    const body = JSON.parse(init.body);
    calls.graphql.push({ query: body.query, auth: init.headers.Authorization });
    return handler(body.query, calls.graphql.length);
  };
  return { fetch, calls };
}

const created = id => json(200, { data: { createCard: { card: { id, title: "x" } } } });
const commented = json(200, { data: { createComment: { comment: { id: "c1" } } } });
function cardFlow(onCreate) {
  return (query, n) => {
    if (query.includes("createComment")) return commented.clone();
    if (query.includes("findCards")) return json(200, { data: { findCards: { edges: [] } } });
    return onCreate(query, n);
  };
}

test("configuração: sem credenciais ou com pipe inválido, a integração fica desligada", () => {
  assert.equal(pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "303033937" }), null);
  assert.equal(pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "abc", PIPEFY_CLIENT_ID: "a", PIPEFY_CLIENT_SECRET: "b" }), null);
  const ok = pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "303033937", PIPEFY_CLIENT_ID: "a", PIPEFY_CLIENT_SECRET: "b" });
  assert.equal(ok.tokenUrl, "https://app.pipefy.com/oauth/token");
  assert.equal(ok.apiUrl, "https://api.pipefy.com/graphql");
});

test("OAuth2: client credentials no corpo, token em cache e reaproveitado", async () => {
  const api = fakePipefy(() => json(200, { data: { pipe: { id: "303033937", name: "Comercial", start_form_fields: [] } } }));
  const client = createPipefyClient(config, { fetch: api.fetch });
  await client.getStartForm();
  await client.getStartForm();
  assert.equal(api.calls.token.length, 1);
  const body = new URLSearchParams(api.calls.token[0].body);
  assert.equal(body.get("grant_type"), "client_credentials");
  assert.equal(body.get("client_id"), "cliente-teste");
  assert.equal(body.get("client_secret"), SECRET);
  assert.ok(api.calls.graphql.every(call => call.auth === "Bearer tok-1"));
});

test("OAuth2: chamadas simultâneas pedem um único token", async () => {
  const api = fakePipefy(() => json(200, { data: { pipe: { id: "1", name: "C", start_form_fields: [] } } }));
  const client = createPipefyClient(config, { fetch: api.fetch });
  await Promise.all([client.getToken(), client.getToken(), client.getToken()]);
  assert.equal(api.calls.token.length, 1);
});

test("OAuth2: renova o token antes de vencer", async () => {
  let clock = 0;
  const api = fakePipefy(() => json(200, { data: { pipe: { id: "1", name: "C", start_form_fields: [] } } }), { expiresIn: 300 });
  const client = createPipefyClient(config, { fetch: api.fetch, now: () => clock });
  await client.getToken();
  clock = 230 * 1000; // ainda dentro da margem de 60 s
  await client.getToken();
  assert.equal(api.calls.token.length, 1);
  clock = 241 * 1000; // passou da margem: pede outro
  assert.equal(await client.getToken(), "tok-2");
});

test("OAuth2: se o formulário for recusado (400), usa JSON e guarda o formato", async () => {
  const tokenCalls = [];
  const fetch = async (url, init) => {
    if (url !== config.tokenUrl) return json(200, { data: {} });
    tokenCalls.push(init.headers["Content-Type"]);
    return init.headers["Content-Type"] === "application/json" ? json(200, { access_token: "t", expires_in: 1 }) : json(400, {});
  };
  const client = createPipefyClient(config, { fetch, now: (() => { let t = 0; return () => (t += 10000); })() });
  await client.getToken();
  await client.getToken();
  assert.deepEqual(tokenCalls, ["application/x-www-form-urlencoded", "application/json", "application/json"]);
});

test("OAuth2: credencial recusada vira erro sem o segredo", async () => {
  const api = fakePipefy(() => json(200, { data: {} }), { tokenStatus: 401 });
  const client = createPipefyClient(config, { fetch: api.fetch });
  await assert.rejects(client.getToken(), error => {
    assert.ok(error instanceof PipefyError);
    assert.equal(error.reason, "token-http-401");
    assert.equal(error.maybeProcessed, false);
    assert.ok(!JSON.stringify({ ...error, message: error.message }).includes(SECRET));
    return true;
  });
});

test("GraphQL: 401 descarta o token e repete uma vez com um novo", async () => {
  const api = fakePipefy((query, n) => n === 1 ? json(401, {}) : json(200, { data: { pipe: { id: "1", name: "C", start_form_fields: [] } } }));
  const client = createPipefyClient(config, { fetch: api.fetch });
  await client.getStartForm();
  assert.equal(api.calls.token.length, 2);
  assert.equal(api.calls.graphql[1].auth, "Bearer tok-2");
});

test("GraphQL: erro com HTTP 200 é falha, e o motivo só tem o código (sem dados do lead)", async () => {
  const api = fakePipefy(() => json(200, { data: { createCard: null }, errors: [{ message: `Valor inválido: ${lead.email}`, extensions: { code: "INVALID_INPUT" } }] }));
  const client = createPipefyClient(config, { fetch: api.fetch });
  await assert.rejects(client.createCard({ title: "t", fields: [] }), error => {
    assert.equal(error.reason, "graphql-INVALID_INPUT");
    assert.equal(error.retryable, false);
    assert.ok(!error.message.includes(lead.email));
    return true;
  });
});

test("GraphQL: leitura repete em falha passageira (503) e desiste depois do limite", async () => {
  let fails = 2;
  const api = fakePipefy(() => fails-- > 0 ? json(503, {}) : json(200, { data: { pipe: { id: "1", name: "C", start_form_fields: [] } } }));
  const client = createPipefyClient(config, { fetch: api.fetch, sleep: noSleep });
  await client.getStartForm();
  assert.equal(api.calls.graphql.length, 3);
  const down = createPipefyClient(config, { fetch: fakePipefy(() => json(503, {})).fetch, sleep: noSleep });
  await assert.rejects(down.getStartForm(), { reason: "http-503" });
});

test("GraphQL: tempo esgotado vira erro passageiro que pode ter sido processado", async () => {
  const fetch = (url, init) => url === config.tokenUrl ? Promise.resolve(json(200, { access_token: "t", expires_in: 3600 }))
    : new Promise((_, reject) => {
      // O timer de AbortSignal.timeout não segura o processo vivo; este segura até o cancelamento chegar.
      const keepAlive = setTimeout(() => {}, 5000);
      init.signal.addEventListener("abort", () => { clearTimeout(keepAlive); reject(init.signal.reason); });
    });
  const client = createPipefyClient(config, { fetch, timeoutMs: 30 });
  await assert.rejects(client.createCard({ title: "t", fields: [] }), error => error.reason === "tempo-esgotado" && error.retryable && error.maybeProcessed);
});

test("query() recusa mutações (o script de consulta é só leitura)", async () => {
  const client = createPipefyClient(config, { fetch: fakePipefy(() => json(200, { data: {} })).fetch });
  await assert.rejects(client.query("mutation { deleteCard(input: {id: 1}) { success } }"), /só consultas de leitura/);
});

test("createCard: pipe, campos e valores escapados; devolve o ID do card", async () => {
  const api = fakePipefy(() => created("1001"));
  const client = createPipefyClient(config, { fetch: api.fetch });
  const card = buildPipefyCard(lead, ids);
  assert.deepEqual(await client.createCard(card), { id: "1001", title: "x" });
  const query = api.calls.graphql[0].query;
  assert.match(query, /^mutation \{ createCard\(input: \{ pipe_id: 303033937, /);
  assert.ok(query.includes('{ field_id: "nome_id", field_value: "Ana \\"Teste\\" Silva" }'));
  assert.ok(query.includes('{ field_id: "whats_id", field_value: "+5516996227258" }'));
});

test("createCard: resposta sem ID não conta como sucesso", async () => {
  const client = createPipefyClient(config, { fetch: fakePipefy(() => json(200, { data: { createCard: { card: null } } })).fetch });
  await assert.rejects(client.createCard({ title: "t", fields: [] }), { reason: "sem-id-do-card" });
});

// Opções reais do pipe 303033937, lidas na API em 17/11/2026 (consulta só de leitura).
const LIVE_ROLE = ["Sou proprietário (a)", "Sou sócio (a)", "Sou gerente", "Sou responsável pelo comercial", "Outro"];
const LIVE_REVENUE = ["Até R$20 mil/mês", "R$20 mil a R$40 mil/mês", "R$40 mil a R$60 mil/mês", "R$60 mil a R$100 mil/mês", "R$100 mil a R$150 mil/mês", "R$150 mil a R$200 mil/mês", "Acima de R$200 mil/mês", "Prefiro não informar"];

test("mapeamento: IDs reais do pipe 303033937 e o leadId no campo de texto curto", () => {
  assert.equal(pipefyMapping.pipeId, "303033937");
  assert.deepEqual(realIds, {
    role: "qual_o_seu_papel_na_oficina_1", revenue: "copy_of_qual_o_seu_papel_na_oficina_1", name: "nome", email: "email_1",
    phone: "telefone", company: "nome_da_oficina", origin: "origem_do_lead_utms", leadId: "id_do_envio_site",
  });
  assert.notEqual(realIds.leadId, "id_do_envio_leadid"); // campo tipo ID automático, não editável
  assert.equal(pipefyExpectedTypes.leadId, "short_text");
});

test("tradução: os 13 valores do site têm opção correspondente, e todas existem no Pipefy", () => {
  assert.deepEqual(Object.keys(pipefyRoleOptions).sort(), roleOptions.map(option => option.value).sort());
  assert.deepEqual(Object.keys(pipefyRevenueOptions).sort(), revenueOptions.map(option => option.value).sort());
  for (const option of Object.values(pipefyRoleOptions)) assert.ok(LIVE_ROLE.includes(option), option);
  for (const option of Object.values(pipefyRevenueOptions)) assert.ok(LIVE_REVENUE.includes(option), option);
  assert.equal(new Set(Object.values(pipefyRoleOptions)).size, 5);
  assert.equal(new Set(Object.values(pipefyRevenueOptions)).size, 8);
  assert.equal(pipefyRoleOptions["Proprietário"], "Sou proprietário (a)");
  assert.equal(pipefyRevenueOptions["ate-20k"], "Até R$20 mil/mês");
});

test("card: os 8 campos com os IDs reais, opções traduzidas, telefone com +55 e leadId", () => {
  assert.equal(pipefyPhone("(11) 3333-4444"), "+551133334444");
  const card = buildPipefyCard(lead, realIds);
  assert.equal(card.title, 'Oficina Exemplo · Ana "Teste" Silva');
  assert.deepEqual(Object.fromEntries(card.fields.map(field => [field.field_id, field.field_value])), {
    qual_o_seu_papel_na_oficina_1: "Sou proprietário (a)",
    nome: 'Ana "Teste" Silva',
    email_1: "ana@oficina.test",
    telefone: "+5516996227258",
    nome_da_oficina: "Oficina Exemplo",
    copy_of_qual_o_seu_papel_na_oficina_1: "R$40 mil a R$60 mil/mês",
    origem_do_lead_utms: originText(lead),
    id_do_envio_site: lead.leadId,
  });
});

test("origem: UTMs e página completas, sem corte", () => {
  const longCampaign = "campanha-" + "x".repeat(190);
  const longPage = "https://giraffeassessoria.com.br/?" + "a=1&".repeat(120) + "utm_source=google";
  const text = originText({ ...lead, landingPage: longPage, utm: { ...lead.utm, campaign: longCampaign } });
  assert.ok(text.length > 255);
  assert.ok(text.includes(`utm_campaign: ${longCampaign}`));
  assert.ok(text.includes(`Página: ${longPage}`));
  assert.equal(originText({ ...lead, utm: { source: "", medium: "", campaign: "", content: "", term: "" } }).split("\n")[0], "Sem parâmetros UTM no link de acesso");
  const card = buildPipefyCard({ ...lead, landingPage: longPage }, realIds);
  assert.ok(card.fields.find(field => field.field_id === "origem_do_lead_utms").field_value.endsWith(longPage));
});

test("comentário: com o mapeamento completo, não repete dados pessoais", () => {
  const summary = buildPipefySummary(lead, realIds);
  for (const personal of ["Ana", lead.email, "99622", "Oficina Exemplo", "R$40"]) assert.ok(!summary.includes(personal), `comentário repete: ${personal}`);
  for (const piece of ["17/11/2026", "Solicitação de contato", lead.leadId]) assert.ok(summary.includes(piece), `comentário sem: ${piece}`);
});

test("comentário: dado sem campo no mapeamento vai para o comentário (nada se perde)", () => {
  const summary = buildPipefySummary(lead, ids);
  for (const piece of ["Oficina Exemplo", "R$40 mil a R$60 mil/mês", "utm_source: google", lead.landingPage, lead.leadId]) assert.ok(summary.includes(piece), `comentário sem: ${piece}`);
  for (const personal of ["Ana", lead.email, "99622"]) assert.ok(!summary.includes(personal), `comentário repete: ${personal}`);
});

test("entrega: cria o card, grava o comentário e confirma o ID", async () => {
  const api = fakePipefy(cardFlow(() => created("2001")));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "2001", duplicate: false, commentSaved: true });
  assert.ok(api.calls.graphql[1].query.includes("card_id: 2001"));
  assert.ok(!api.calls.graphql[1].query.includes(lead.email), "comentário não leva o e-mail");
});

test("entrega: com campo de leadId, card já existente não é criado de novo", async () => {
  const api = fakePipefy(query => query.includes("findCards") ? json(200, { data: { findCards: { edges: [{ node: { id: "3001" } }] } } }) : created("9999"));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, { ...ids, leadId: "lid" }, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "3001", duplicate: true, commentSaved: false });
  assert.ok(!api.calls.graphql.some(call => call.query.includes("createCard")));
});

test("entrega: tempo esgotado sem campo de leadId não repete (evita card duplicado) e devolve erro", async () => {
  let creates = 0;
  const api = fakePipefy(cardFlow(() => { creates++; return json(504, {}); }));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: false, reason: "http-504" });
  assert.equal(creates, 1);
});

test("entrega: tempo esgotado com campo de leadId confere no Pipefy e não duplica", async () => {
  let creates = 0, finds = 0;
  const api = fakePipefy(query => {
    if (query.includes("findCards")) return json(200, { data: { findCards: { edges: ++finds > 1 ? [{ node: { id: "4001" } }] : [] } } });
    creates++;
    return json(504, {});
  });
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch, sleep: noSleep }), lead, { ...ids, leadId: "lid" }, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "4001", duplicate: true, commentSaved: false });
  assert.equal(creates, 1);
});

test("entrega: tempo esgotado com campo de leadId e card ainda não visível → erro, sem nova criação", async () => {
  // O pedido pode terminar no Pipefy depois do prazo: criar de novo geraria um card duplicado.
  let creates = 0;
  const api = fakePipefy(query => {
    if (query.includes("findCards")) return json(200, { data: { findCards: { edges: [] } } });
    creates++;
    return json(504, {});
  });
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch, sleep: noSleep }), lead, realIds, { sleep: noSleep });
  assert.deepEqual(result, { ok: false, reason: "http-504" });
  assert.equal(creates, 1);
});

test("entrega: card criado com atraso é encontrado no reenvio do mesmo leadId (não duplica)", async () => {
  let creates = 0;
  const api = fakePipefy(query => {
    if (query.includes("findCards")) return json(200, { data: { findCards: { edges: [{ node: { id: "7001" } }] } } });
    creates++;
    return created("9999");
  });
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, realIds, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "7001", duplicate: true, commentSaved: false });
  assert.equal(creates, 0);
  assert.ok(api.calls.graphql[0].query.includes('fieldId: "id_do_envio_site"'));
  assert.ok(api.calls.graphql[0].query.includes(`fieldValue: "${lead.leadId}"`));
});

test("entrega: indisponibilidade antes do processamento (503) é repetida e cria um só card", async () => {
  let creates = 0;
  const api = fakePipefy(cardFlow(() => ++creates < 3 ? json(503, {}) : created("5001")));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.equal(result.ok, true);
  assert.equal(result.cardId, "5001");
  assert.equal(creates, 3);
});

test("entrega: Pipefy fora do ar até o fim devolve erro (nunca sucesso falso)", async () => {
  const api = fakePipefy(cardFlow(() => json(503, {})));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: false, reason: "http-503" });
});

test("entrega: erro de validação do Pipefy não é repetido", async () => {
  let creates = 0;
  const api = fakePipefy(cardFlow(() => { creates++; return json(200, { errors: [{ message: "x", extensions: { code: "INVALID_INPUT" } }] }); }));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: false, reason: "graphql-INVALID_INPUT" });
  assert.equal(creates, 1);
});

test("entrega: token recusado devolve erro sem tentar criar card", async () => {
  const api = fakePipefy(cardFlow(() => created("1")), { tokenStatus: 401 });
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: false, reason: "token-http-401" });
  assert.equal(api.calls.graphql.length, 0);
});

test("entrega: falha no comentário não desfaz o card, mas fica registrada", async () => {
  const api = fakePipefy(query => query.includes("createComment") ? json(200, { errors: [{ extensions: { code: "PERMISSION_DENIED" } }] }) : created("6001"));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "6001", duplicate: false, commentSaved: false, commentReason: "graphql-PERMISSION_DENIED" });
});
