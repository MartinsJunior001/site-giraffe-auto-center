// Testes isolados da integração com o Pipefy: a API é simulada, nada sai da máquina.
// Rodar com: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPipefyClient, pipefyConfigFromEnv, pipefyFieldIdsFromEnv, PipefyError } from "../src/lib/pipefy.ts";
import { buildPipefyCard, buildPipefySummary, deliverLeadToPipefy, pipefyPhone } from "../src/lib/pipefy-lead.ts";

const SECRET = "segredo-de-teste-nao-vazar";
const config = { pipeId: "307417378", clientId: "cliente-teste", clientSecret: SECRET, tokenUrl: "https://token.test/oauth/token", apiUrl: "https://api.test/graphql" };
const ids = { role: "papel_id", name: "nome_id", email: "email_id", phone: "whats_id" };
const lead = {
  leadId: "3f2b8c1e-1d2a-4b5c-8d9e-0a1b2c3d4e5f",
  roleOption: "Sou proprietário(a)", roleLabel: "Sou proprietário(a)",
  revenueLabel: "R$ 40 mil a R$ 60 mil/mês",
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

test("configuração: sem credenciais ou sem os 4 campos obrigatórios, a integração fica desligada", () => {
  assert.equal(pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "307417378" }), null);
  assert.equal(pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "abc", PIPEFY_CLIENT_ID: "a", PIPEFY_CLIENT_SECRET: "b" }), null);
  const ok = pipefyConfigFromEnv({ PIPEFY_PIPE_ID: "307417378", PIPEFY_CLIENT_ID: "a", PIPEFY_CLIENT_SECRET: "b" });
  assert.equal(ok.tokenUrl, "https://app.pipefy.com/oauth/token");
  assert.equal(ok.apiUrl, "https://api.pipefy.com/graphql");
  assert.equal(pipefyFieldIdsFromEnv({ PIPEFY_FIELD_ROLE: "a", PIPEFY_FIELD_NAME: "b", PIPEFY_FIELD_EMAIL: "c" }), null);
  assert.deepEqual(pipefyFieldIdsFromEnv({ PIPEFY_FIELD_ROLE: "a", PIPEFY_FIELD_NAME: "b", PIPEFY_FIELD_EMAIL: "c", PIPEFY_FIELD_PHONE: "d", PIPEFY_FIELD_LEAD_ID: "e" }),
    { role: "a", name: "b", email: "c", phone: "d", company: undefined, revenue: undefined, origin: undefined, leadId: "e" });
});

test("OAuth2: client credentials no corpo, token em cache e reaproveitado", async () => {
  const api = fakePipefy(() => json(200, { data: { pipe: { id: "307417378", name: "Comercial", start_form_fields: [] } } }));
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
  assert.match(query, /^mutation \{ createCard\(input: \{ pipe_id: 307417378, /);
  assert.ok(query.includes('{ field_id: "nome_id", field_value: "Ana \\"Teste\\" Silva" }'));
  assert.ok(query.includes('{ field_id: "whats_id", field_value: "+5516996227258" }'));
});

test("createCard: resposta sem ID não conta como sucesso", async () => {
  const client = createPipefyClient(config, { fetch: fakePipefy(() => json(200, { data: { createCard: { card: null } } })).fetch });
  await assert.rejects(client.createCard({ title: "t", fields: [] }), { reason: "sem-id-do-card" });
});

test("mapeamento: 4 campos obrigatórios, opcionais só com ID, nada do formulário é descartado", () => {
  assert.equal(pipefyPhone("(11) 3333-4444"), "+551133334444");
  const basic = buildPipefyCard(lead, ids);
  assert.equal(basic.title, 'Oficina Exemplo · Ana "Teste" Silva');
  assert.deepEqual(basic.fields.map(field => field.field_id), ["papel_id", "nome_id", "email_id", "whats_id"]);
  assert.equal(basic.fields[0].field_value, "Sou proprietário(a)");
  const full = buildPipefyCard(lead, { ...ids, company: "of", revenue: "fat", origin: "orig", leadId: "lid" });
  assert.deepEqual(full.fields.slice(4).map(field => [field.field_id, field.field_value.slice(0, 22)]),
    [["of", "Oficina Exemplo"], ["fat", "R$ 40 mil a R$ 60 mil/"], ["orig", "utm_source=google | ut"], ["lid", lead.leadId.slice(0, 22)]]);
  const summary = buildPipefySummary(lead);
  for (const piece of ["Oficina Exemplo", "Sou proprietário(a)", "R$ 40 mil a R$ 60 mil/mês", lead.email, "(16) 99622-7258", "utm_source: google", "utm_medium: cpc", "utm_campaign: oficinas", "utm_content: -", lead.landingPage, lead.leadId, "17/11/2026"]) {
    assert.ok(summary.includes(piece), `resumo sem: ${piece}`);
  }
});

test("entrega: cria o card, grava o comentário e confirma o ID", async () => {
  const api = fakePipefy(cardFlow(() => created("2001")));
  const result = await deliverLeadToPipefy(createPipefyClient(config, { fetch: api.fetch }), lead, ids, { sleep: noSleep });
  assert.deepEqual(result, { ok: true, cardId: "2001", duplicate: false, commentSaved: true });
  assert.ok(api.calls.graphql[1].query.includes("card_id: 2001"));
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
