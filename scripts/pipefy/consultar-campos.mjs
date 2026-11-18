// Consulta SOMENTE DE LEITURA do funil Comercial no Pipefy: autentica a conta de serviço, lista os campos do formulário
// inicial (IDs reais) e confere se as opções do site existem no Pipefy. Não cria, não altera e não exclui nada.
//
// Uso (na pasta do projeto):  node scripts/pipefy/consultar-campos.mjs
// Credenciais: arquivo .env.pipefy.local (ignorado pelo Git) com PIPEFY_CLIENT_ID e PIPEFY_CLIENT_SECRET,
// ou as mesmas variáveis no ambiente. Os valores nunca são impressos.
import { existsSync } from "node:fs";
import { createPipefyClient, pipefyConfigFromEnv } from "../../src/lib/pipefy.ts";
import { roleOptions } from "../../src/content/diagnosis.ts";

const envFile = new URL("../../.env.pipefy.local", import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);
process.env.PIPEFY_PIPE_ID ||= "307417378";

const missing = ["PIPEFY_CLIENT_ID", "PIPEFY_CLIENT_SECRET"].filter(key => !process.env[key]?.trim());
if (missing.length) {
  console.log(`Credenciais ausentes: ${missing.join(", ")}.`);
  console.log("Crie o arquivo .env.pipefy.local na pasta do projeto com essas variáveis (ele não vai para o Git) e rode de novo.");
  process.exit(2);
}

const config = pipefyConfigFromEnv();
if (!config) { console.log("PIPEFY_PIPE_ID inválido: use só números."); process.exit(2); }
const client = createPipefyClient(config, { timeoutMs: 15000 });

try {
  await client.getToken();
  console.log(`Autenticação OAuth2: OK (token recebido de ${config.tokenUrl}; não exibido).`);
} catch (error) {
  console.log(`Autenticação OAuth2: FALHOU (${error.reason ?? error.message}).`);
  process.exit(1);
}

let pipe;
try {
  pipe = await client.getStartForm(true);
} catch (error) {
  // Se type/required/options não existirem no esquema, repete só com id e label.
  console.log(`Consulta detalhada recusada (${error.reason ?? error.message}); repetindo só com id e label.`);
  pipe = await client.getStartForm(false);
}

console.log(`\nPipe ${pipe.id}: ${pipe.name}`);
console.log(`Campos do formulário inicial (${pipe.start_form_fields.length}):\n`);
for (const field of pipe.start_form_fields) {
  console.log(`- id: ${field.id}`);
  console.log(`  rótulo: ${field.label}`);
  if (field.type !== undefined) console.log(`  tipo: ${field.type}`);
  if (field.required !== undefined) console.log(`  obrigatório: ${field.required ? "sim" : "não"}`);
  if (field.options?.length) console.log(`  opções: ${field.options.map(option => JSON.stringify(option)).join(", ")}`);
}

// Opções do papel: o site envia o texto exibido ao visitante (label). Confere em todos os campos com opções.
const withOptions = pipe.start_form_fields.filter(field => field.options?.length);
if (withOptions.length) {
  console.log("\nConferência das opções de papel do site:");
  for (const option of roleOptions) {
    const hits = withOptions.filter(field => field.options.includes(option.label)).map(field => field.id);
    console.log(`- "${option.label}": ${hits.length ? `existe em ${hits.join(", ")}` : "NÃO encontrada em nenhum campo"}`);
  }
}

// Confere no esquema as operações que a integração usa (introspecção, também só leitura).
try {
  const schema = await client.query(`query {
    q: __schema { queryType { fields { name } } mutationType { fields { name } } }
    cardInput: __type(name: "CreateCardInput") { inputFields { name } }
    commentInput: __type(name: "CreateCommentInput") { inputFields { name } }
  }`);
  const queries = new Set(schema.q.queryType.fields.map(field => field.name));
  const mutations = new Set(schema.q.mutationType.fields.map(field => field.name));
  console.log("\nOperações usadas pela integração:");
  console.log(`- findCards: ${queries.has("findCards") ? "disponível" : "NÃO encontrada"}`);
  console.log(`- createCard: ${mutations.has("createCard") ? "disponível" : "NÃO encontrada"}${schema.cardInput ? ` (entrada: ${schema.cardInput.inputFields.map(field => field.name).join(", ")})` : ""}`);
  console.log(`- createComment: ${mutations.has("createComment") ? "disponível" : "NÃO encontrada"}${schema.commentInput ? ` (entrada: ${schema.commentInput.inputFields.map(field => field.name).join(", ")})` : ""}`);
} catch (error) {
  console.log(`\nIntrospecção do esquema indisponível (${error.reason ?? error.message}).`);
}
