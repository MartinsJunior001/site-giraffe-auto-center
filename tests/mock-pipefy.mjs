// Simulador local do Pipefy (OAuth2 + GraphQL) e do webhook do Make, para testar a rota /api/leads sem tocar na produção.
// Uso: node tests/mock-pipefy.mjs [porta]   (padrão 4010)
// Controle: POST /__mode {"create": "ok" | "503" | "invalid" | "slow", "token": "ok" | "401"}; GET /__state; POST /__reset;
// POST /__seed {"query": "..."} registra um card "pré-existente" (sem contar como criação nova) para testar a busca do leadId.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 4010);
const CLIENT_ID = "mock-client";
const CLIENT_SECRET = "mock-secret";
let mode = { create: "ok", token: "ok" };
let state = { tokens: 0, creates: [], comments: [], finds: 0, make: [], badAuth: 0 };
let nextId = 9000;

const send = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
const read = req => new Promise(resolve => { let s = ""; req.on("data", d => (s += d)); req.on("end", () => resolve(s)); });

createServer(async (req, res) => {
  const body = await read(req);
  if (req.url === "/__mode") { mode = { ...mode, ...JSON.parse(body) }; return send(res, 200, mode); }
  if (req.url === "/__reset") { mode = { create: "ok", token: "ok" }; state = { tokens: 0, creates: [], comments: [], finds: 0, make: [], badAuth: 0 }; return send(res, 200, {}); }
  if (req.url === "/__state") return send(res, 200, state);
  if (req.url === "/__seed") { state.creates.push({ id: String(++nextId), query: JSON.parse(body).query, seeded: true }); return send(res, 200, {}); }

  if (req.url === "/oauth/token") {
    state.tokens++;
    const params = new URLSearchParams(body);
    if (mode.token !== "ok" || params.get("grant_type") !== "client_credentials" || params.get("client_id") !== CLIENT_ID || params.get("client_secret") !== CLIENT_SECRET) return send(res, 401, { error: "invalid_client" });
    return send(res, 200, { access_token: `mock-token-${state.tokens}`, token_type: "Bearer", expires_in: 3600 });
  }

  if (req.url === "/make") {
    const lead = JSON.parse(body);
    state.make.push(lead);
    return send(res, 200, { ok: true, leadId: lead.leadId });
  }

  if (req.url === "/graphql") {
    if (!/^Bearer mock-token-\d+$/.test(req.headers.authorization ?? "")) { state.badAuth++; return send(res, 401, {}); }
    const { query } = JSON.parse(body);
    if (query.includes("findCards")) {
      state.finds++;
      const value = /fieldValue: ("(?:[^"\\]|\\.)*")/.exec(query)?.[1];
      const hit = value && state.creates.find(card => card.query.includes(`field_value: ${value}`));
      return send(res, 200, { data: { findCards: { edges: hit ? [{ node: { id: hit.id } }] : [] } } });
    }
    if (query.includes("createComment")) {
      state.comments.push(query);
      return send(res, 200, { data: { createComment: { comment: { id: `c${state.comments.length}` } } } });
    }
    if (query.includes("createCard")) {
      if (mode.create === "503") { state.creates.push({ id: null, query }); return send(res, 503, {}); }
      if (mode.create === "invalid") { state.creates.push({ id: null, query }); return send(res, 200, { data: { createCard: null }, errors: [{ message: "Field email is invalid", extensions: { code: "INVALID_INPUT" } }] }); }
      if (mode.create === "slow") { state.creates.push({ id: null, query }); return setTimeout(() => send(res, 200, { data: { createCard: { card: { id: "late", title: "x" } } } }), 12000); }
      const id = String(++nextId);
      state.creates.push({ id, query });
      return send(res, 200, { data: { createCard: { card: { id, title: "x" } } } });
    }
    return send(res, 200, { data: {} });
  }
  send(res, 404, {});
}).listen(port, "127.0.0.1", () => console.log(`mock Pipefy em http://127.0.0.1:${port}`));
