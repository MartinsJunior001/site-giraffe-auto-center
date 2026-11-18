// Consulta SOMENTE DE LEITURA do funil "[CO] Comercial" no Pipefy: autentica a conta de serviço, lista os campos do
// formulário inicial e confere o mapeamento do site (src/content/pipefy.ts): IDs, tipos, campos editáveis e as
// 13 opções traduzidas de papel e faturamento. Não cria, não altera e não exclui nada.
//
// Uso (na pasta do projeto):  node scripts/pipefy/consultar-campos.mjs
// Credenciais: arquivo .env.pipefy.local (ignorado pelo Git) com PIPEFY_CLIENT_ID e PIPEFY_CLIENT_SECRET,
// ou as mesmas variáveis no ambiente. Os valores nunca são impressos. Sai com código 1 se algo não bater.
import { existsSync } from "node:fs";
import { createPipefyClient, pipefyConfigFromEnv } from "../../src/lib/pipefy.ts";
import { pipefyExpectedTypes, pipefyMapping, pipefyRevenueOptions, pipefyRoleOptions } from "../../src/content/pipefy.ts";

const envFile = new URL("../../.env.pipefy.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
process.env.PIPEFY_PIPE_ID ||= pipefyMapping.pipeId;

const missing = ["PIPEFY_CLIENT_ID", "PIPEFY_CLIENT_SECRET"].filter(key => !process.env[key]?.trim());
if (missing.length) {
  console.log(`Credenciais ausentes: ${missing.join(", ")}.`);
  console.log("Crie o arquivo .env.pipefy.local na pasta do projeto com essas variáveis (ele não vai para o Git) e rode de novo.");
  process.exit(2);
}

const config = pipefyConfigFromEnv();
if (!config) { console.log("PIPEFY_PIPE_ID inválido: use só números."); process.exit(2); }
if (config.pipeId !== pipefyMapping.pipeId) console.log(`Atenção: PIPEFY_PIPE_ID=${config.pipeId}, mas o mapeamento é do pipe ${pipefyMapping.pipeId}.`);
const client = createPipefyClient(config, { timeoutMs: 15000 });

try {
  await client.getToken();
  console.log(`Autenticação OAuth2: OK (token recebido de ${config.tokenUrl}; não exibido).`);
} catch (error) {
  console.log(`Autenticação OAuth2: FALHOU (${error.reason ?? error.message}).`);
  process.exit(1);
}

const { pipe } = await client.query(`query { pipe(id: ${config.pipeId}) { id name start_form_fields { id label type required editable options } } }`);
if (!pipe) { console.log(`Pipe ${config.pipeId}: sem acesso ou inexistente.`); process.exit(1); }
console.log(`\nPipe ${pipe.id}: ${pipe.name}`);
console.log(`Campos do formulário inicial (${pipe.start_form_fields.length}):`);
for (const field of pipe.start_form_fields) {
  console.log(`- ${field.id} | "${field.label}" | ${field.type} | obrigatório: ${field.required ? "sim" : "não"} | editável: ${field.editable ? "sim" : "não"}${field.options?.length ? ` | opções: ${field.options.map(option => JSON.stringify(option)).join(", ")}` : ""}`);
}

const results = [];
const check = (name, pass, info = "") => { results.push(pass); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${info ? ` | ${info}` : ""}`); };
console.log("\nConferência do mapeamento (src/content/pipefy.ts):");
const byId = new Map(pipe.start_form_fields.map(field => [field.id, field]));
for (const [key, id] of Object.entries(pipefyMapping.fields)) {
  const field = byId.get(id);
  const expected = pipefyExpectedTypes[key];
  check(`campo ${key} → ${id}`, !!field && field.type === expected && field.editable !== false, field ? `tipo ${field.type} (esperado ${expected}), editável: ${field.editable ? "sim" : "não"}` : "não existe no formulário inicial");
}
for (const [label, table, id] of [["papel", pipefyRoleOptions, pipefyMapping.fields.role], ["faturamento", pipefyRevenueOptions, pipefyMapping.fields.revenue]]) {
  const options = byId.get(id)?.options ?? [];
  for (const [siteValue, pipefyOption] of Object.entries(table)) check(`opção de ${label} "${siteValue}" → "${pipefyOption}"`, options.includes(pipefyOption));
}
const required = pipe.start_form_fields.filter(field => field.required && !Object.values(pipefyMapping.fields).includes(field.id));
check("nenhum campo obrigatório fora do mapeamento", required.length === 0, required.map(field => field.id).join(", "));

// Operações usadas pela integração (introspecção, também só leitura).
const schema = await client.query(`query { q: __schema { queryType { fields { name } } mutationType { fields { name } } } }`).catch(error => { console.log(`Introspecção indisponível (${error.reason ?? error.message}).`); return null; });
if (schema) {
  const queries = new Set(schema.q.queryType.fields.map(field => field.name));
  const mutations = new Set(schema.q.mutationType.fields.map(field => field.name));
  check("operação findCards disponível", queries.has("findCards"));
  check("operação createCard disponível", mutations.has("createCard"));
  check("operação createComment disponível", mutations.has("createComment"));
}

const failed = results.filter(pass => !pass).length;
console.log(`\nTOTAL: ${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
