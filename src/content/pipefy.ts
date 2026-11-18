// Mapeamento do formulário do site para o funil "[CO] Comercial" do Pipefy (pipe 303033937).
//
// Nada aqui é segredo: são IDs de campos e textos de opções, conferidos na API real com uma consulta só de leitura
// (node scripts/pipefy/consultar-campos.mjs) em 17/11/2026. Se a equipe mudar um campo ou uma opção no Pipefy, rode
// a consulta de novo: ela aponta o que deixou de bater. Credenciais ficam só nas variáveis de ambiente (PIPEFY_*).
//
// Sem imports de runtime: os testes isolados (tests/*.test.mjs) carregam este arquivo direto no Node.
import type { revenueOptions, roleOptions } from "./diagnosis";

type RoleValue = (typeof roleOptions)[number]["value"];
type RevenueValue = (typeof revenueOptions)[number]["value"];

export const pipefyMapping = {
  /** O envio só acontece se PIPEFY_PIPE_ID for este pipe: IDs de outro pipe nunca são usados por engano. */
  pipeId: "303033937",
  pipeName: "[CO] Comercial",
  /** IDs reais dos campos do formulário inicial (start_form_fields). */
  fields: {
    role: "qual_o_seu_papel_na_oficina_1", // select "Qual é o seu papel na oficina?"
    revenue: "copy_of_qual_o_seu_papel_na_oficina_1", // select "Quanto sua oficina fatura por mês, em média?"
    name: "nome", // short_text "Seu nome"
    email: "email_1", // email "Seu melhor e-mail"
    phone: "telefone", // phone "Seu WhatsApp"
    company: "nome_da_oficina", // short_text "Nome da oficina"
    origin: "origem_do_lead_utms", // long_text "Origem do lead / UTMs"
    leadId: "id_do_envio_site", // short_text "ID do envio (site)." — não confundir com id_do_envio_leadid (tipo ID automático, não editável)
  },
} as const;

/**
 * Tradução das respostas do site (value em src/content/diagnosis.ts) para o texto exato das opções no Pipefy.
 * O texto exibido ao visitante não muda; só o valor gravado no card segue a grafia do Pipefy
 * (ex.: "Sou proprietário (a)" com espaço, "R$20" sem espaço).
 */
export const pipefyRoleOptions: Record<RoleValue, string> = {
  "Proprietário": "Sou proprietário (a)",
  "Sócio": "Sou sócio (a)",
  "Gerente": "Sou gerente",
  "Responsável comercial": "Sou responsável pelo comercial",
  "Outro": "Outro",
};

export const pipefyRevenueOptions: Record<RevenueValue, string> = {
  "ate-20k": "Até R$20 mil/mês",
  "20k-40k": "R$20 mil a R$40 mil/mês",
  "40k-60k": "R$40 mil a R$60 mil/mês",
  "60k-100k": "R$60 mil a R$100 mil/mês",
  "100k-150k": "R$100 mil a R$150 mil/mês",
  "150k-200k": "R$150 mil a R$200 mil/mês",
  "acima-200k": "Acima de R$200 mil/mês",
  "nao-informado": "Prefiro não informar",
};

/** Tipos esperados de cada campo; a consulta de leitura confere contra a API. */
export const pipefyExpectedTypes = {
  role: "select", revenue: "select", name: "short_text", email: "email", phone: "phone",
  company: "short_text", origin: "long_text", leadId: "short_text",
} as const;
