// Cliente da API do Pipefy, usado só no servidor (rota /api/leads e scripts/pipefy).
// Não tem dependências nem imports de runtime: os testes isolados (tests/*.test.mjs) carregam este arquivo direto no Node.
//
// Autenticação: conta de serviço com OAuth2 client credentials. O token fica em memória e é renovado antes de vencer.
// Segurança: nenhuma mensagem de erro carrega o Client Secret, o token ou dados do lead; só códigos técnicos curtos.

export type PipefyConfig = { pipeId: string; clientId: string; clientSecret: string; tokenUrl: string; apiUrl: string };

/** IDs dos campos do formulário inicial do pipe (src/content/pipefy.ts), conferidos na API; nunca deduzidos do nome visual. */
export type PipefyFieldIds = {
  role: string; name: string; email: string; phone: string;
  company?: string; revenue?: string; origin?: string; leadId?: string;
};

export type PipefyFieldValue = { field_id: string; field_value: string };
export type PipefyStartField = { id: string; label: string; type?: string; required?: boolean; options?: string[] };

const DEFAULT_TOKEN_URL = "https://app.pipefy.com/oauth/token";
const DEFAULT_API_URL = "https://api.pipefy.com/graphql";

export function pipefyConfigFromEnv(env: Record<string, string | undefined> = process.env): PipefyConfig | null {
  const pipeId = env.PIPEFY_PIPE_ID?.trim() ?? "";
  const clientId = env.PIPEFY_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.PIPEFY_CLIENT_SECRET?.trim() ?? "";
  if (!pipeId || !clientId || !clientSecret || !/^\d+$/.test(pipeId)) return null;
  return {
    pipeId, clientId, clientSecret,
    tokenUrl: env.PIPEFY_TOKEN_URL?.trim() || DEFAULT_TOKEN_URL,
    apiUrl: env.PIPEFY_API_URL?.trim() || DEFAULT_API_URL,
  };
}

/**
 * Erro com motivo técnico seguro para log.
 * retryable: falha passageira (rede, tempo, 429, 5xx).
 * maybeProcessed: o pedido pode ter chegado ao Pipefy. Numa criação de card, repetir sem conferir pode duplicar.
 */
export class PipefyError extends Error {
  readonly reason: string;
  readonly retryable: boolean;
  readonly maybeProcessed: boolean;
  constructor(reason: string, retryable: boolean, maybeProcessed: boolean) {
    super(reason);
    this.name = "PipefyError";
    this.reason = reason;
    this.retryable = retryable;
    this.maybeProcessed = maybeProcessed;
  }
}

// Códigos do Pipefy (extensions.code) que indicam falha passageira do lado deles.
const RETRYABLE_CODES = new Set(["INTERNAL_SERVER_ERROR", "SERVICE_UNAVAILABLE", "TIMEOUT"]);

/** Texto como literal GraphQL. A sintaxe de string do JSON é aceita pelo GraphQL, e as aspas e barras ficam escapadas. */
export function gqlString(value: string) {
  return JSON.stringify(value);
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export type PipefyClientOptions = {
  fetch?: FetchLike;
  /** Tempo máximo de cada requisição HTTP. */
  timeoutMs?: number;
  /** Novas tentativas em consultas de leitura que falharem por motivo passageiro. */
  readRetries?: number;
  retryDelayMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export type PipefyClient = ReturnType<typeof createPipefyClient>;

export function createPipefyClient(config: PipefyConfig, options: PipefyClientOptions = {}) {
  const doFetch: FetchLike = options.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? 8000;
  const readRetries = options.readRetries ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 400;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));

  let token: { value: string; expiresAt: number } | null = null;
  let pendingToken: Promise<string> | null = null;
  // A documentação não diz se o endpoint de token espera formulário (padrão OAuth2) ou JSON. Tenta o formulário e,
  // se o servidor recusar o formato (400/415/422), usa JSON e guarda o formato que funcionou.
  let tokenFormat: "form" | "json" = "form";

  async function send(url: string, init: RequestInit): Promise<Response> {
    try {
      return await doFetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new PipefyError(timeout ? "tempo-esgotado" : "falha-de-rede", true, true);
    }
  }

  function tokenRequest(format: "form" | "json"): RequestInit {
    const params = { grant_type: "client_credentials", client_id: config.clientId, client_secret: config.clientSecret };
    return format === "form"
      ? { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams(params).toString() }
      : { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(params) };
  }

  async function fetchToken(): Promise<string> {
    let response: Response;
    try {
      response = await send(config.tokenUrl, tokenRequest(tokenFormat));
      if ([400, 415, 422].includes(response.status) && tokenFormat === "form") {
        const retry = await send(config.tokenUrl, tokenRequest("json"));
        if (retry.ok) tokenFormat = "json";
        response = retry;
      }
    } catch (error) {
      // Nada foi criado no Pipefy: falha só na obtenção do token.
      if (error instanceof PipefyError) throw new PipefyError(`token-${error.reason}`, true, false);
      throw error;
    }
    if (!response.ok) throw new PipefyError(`token-http-${response.status}`, response.status === 429 || response.status >= 500, false);
    const data = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown } | null;
    if (!data || typeof data.access_token !== "string" || !data.access_token) throw new PipefyError("token-sem-access-token", false, false);
    // Sem expires_in, usa 5 minutos (o menor prazo que o Pipefy permite para a conta de serviço).
    const ttl = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 300;
    const margin = Math.min(60, ttl / 2);
    token = { value: data.access_token, expiresAt: now() + (ttl - margin) * 1000 };
    return token.value;
  }

  /** Token válido em cache ou um novo. Chamadas simultâneas compartilham a mesma requisição. */
  async function getToken(): Promise<string> {
    if (token && now() < token.expiresAt) return token.value;
    pendingToken ??= fetchToken().finally(() => { pendingToken = null; });
    return pendingToken;
  }

  async function postGraphql<T>(query: string, renewed = false): Promise<T> {
    const accessToken = await getToken();
    const response = await send(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ query }),
    });
    if (response.status === 401 && !renewed) {
      // Token revogado ou vencido antes da hora: descarta e tenta uma vez com um novo.
      token = null;
      return postGraphql<T>(query, true);
    }
    // 429, 502 e 503 vêm antes de a operação rodar; 500, 504 e queda de conexão podem ter rodado.
    if (!response.ok) throw new PipefyError(`http-${response.status}`, response.status === 429 || response.status >= 500, ![429, 502, 503].includes(response.status));
    const body = await response.json().catch(() => null) as { data?: unknown; errors?: { extensions?: { code?: unknown } }[] } | null;
    if (!body) throw new PipefyError("resposta-invalida", true, true);
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      // A mensagem do Pipefy pode repetir o valor enviado (dados pessoais): só o código vai para o motivo.
      const code = body.errors[0]?.extensions?.code;
      const safeCode = typeof code === "string" && /^[A-Z_]{2,60}$/.test(code) ? code : "SEM_CODIGO";
      throw new PipefyError(`graphql-${safeCode}`, RETRYABLE_CODES.has(safeCode), false);
    }
    if (!body.data) throw new PipefyError("sem-dados", true, true);
    return body.data as T;
  }

  /** Consulta de leitura, com novas tentativas em falhas passageiras. */
  async function query<T>(text: string): Promise<T> {
    if (/^\s*mutation\b/.test(text)) throw new Error("query() aceita só consultas de leitura.");
    for (let attempt = 0; ; attempt++) {
      try {
        return await postGraphql<T>(text);
      } catch (error) {
        if (!(error instanceof PipefyError) || !error.retryable || attempt >= readRetries) throw error;
        await sleep(retryDelayMs * 2 ** attempt);
      }
    }
  }

  /** Mutação: uma única tentativa. Quem chama decide se pode repetir (ver deliverLeadToPipefy). */
  function mutate<T>(text: string): Promise<T> {
    return postGraphql<T>(text);
  }

  return {
    getToken,
    query,

    async getStartForm(withDetails = true) {
      const fields = withDetails ? "id label type required options" : "id label";
      const data = await query<{ pipe: { id: string; name: string; start_form_fields: PipefyStartField[] } | null }>(
        `query { pipe(id: ${config.pipeId}) { id name start_form_fields { ${fields} } } }`,
      );
      if (!data.pipe) throw new PipefyError("pipe-nao-encontrado", false, false);
      return data.pipe;
    },

    /** Procura um card do pipe pelo valor exato de um campo. Devolve o ID do primeiro encontrado. */
    async findCardIdByField(fieldId: string, value: string): Promise<string | null> {
      const data = await query<{ findCards: { edges: { node: { id: string } }[] } | null }>(
        `query { findCards(pipeId: ${config.pipeId}, search: { fieldId: ${gqlString(fieldId)}, fieldValue: ${gqlString(value)} }) { edges { node { id } } } }`,
      );
      return data.findCards?.edges?.[0]?.node?.id ?? null;
    },

    async createCard(card: { title: string; fields: PipefyFieldValue[] }): Promise<{ id: string; title: string }> {
      const fields = card.fields.map(field => `{ field_id: ${gqlString(field.field_id)}, field_value: ${gqlString(field.field_value)} }`).join(", ");
      const data = await mutate<{ createCard: { card: { id: string; title: string } | null } | null }>(
        `mutation { createCard(input: { pipe_id: ${config.pipeId}, title: ${gqlString(card.title)}, fields_attributes: [${fields}] }) { card { id title } } }`,
      );
      const created = data.createCard?.card;
      if (!created?.id) throw new PipefyError("sem-id-do-card", false, true);
      return { id: String(created.id), title: created.title };
    },

    async createComment(cardId: string, text: string): Promise<string> {
      if (!/^\d+$/.test(cardId)) throw new PipefyError("id-do-card-invalido", false, false);
      const data = await mutate<{ createComment: { comment: { id: string } | null } | null }>(
        `mutation { createComment(input: { card_id: ${cardId}, text: ${gqlString(text)} }) { comment { id } } }`,
      );
      const id = data.createComment?.comment?.id;
      if (!id) throw new PipefyError("sem-id-do-comentario", false, true);
      return String(id);
    },
  };
}
