// Política de privacidade (página /politica-de-privacidade).
//
// O texto da página descreve só o que o site faz de fato. Os campos abaixo dependem de confirmação da Giraffe:
// enquanto algum campo obrigatório estiver vazio, a página mostra o trecho destacado como "a confirmar" e, em
// produção, o formulário não aceita envios (a rota /api/leads responde 503). Assim nenhum dado pessoal é
// coletado com a política incompleta.
export const privacyPolicyPath = "/politica-de-privacidade";

type PrivacyPolicy = {
  /** Data desta versão da política, por exemplo "14 de novembro de 2026". */
  updatedAt: string;
  /** Razão social da empresa responsável pelos dados (controladora). */
  legalName: string;
  /** CNPJ da controladora. */
  cnpj: string;
  /** E-mail para pedidos sobre dados pessoais. */
  contactEmail: string;
  /** Ferramenta que recebe os contatos do formulário pelo webhook (CRM, automação, planilha etc.). */
  leadDestination: string;
  /** Por quanto tempo os contatos ficam guardados e o que acontece depois (frase completa). */
  retention: string;
  /** Base legal da LGPD para tratar os dados do formulário. */
  legalBasis: string;
  /** Opcional: encarregado pelo tratamento de dados (DPO), se houver. */
  dpo: string;
  /** Opcional: endereço da sede. */
  address: string;
  /** Opcional: provedor onde o site está hospedado. */
  hosting: string;
  /** Opcional: o que o servidor registra nos acessos (IP, data e hora etc.) e por quanto tempo (frase completa). */
  serverLogs: string;
};

export const privacyPolicy: PrivacyPolicy = {
  updatedAt: "",
  legalName: "Giraffe Marketing LTDA",
  cnpj: "40.160.836/0001-78",
  contactEmail: "contato@giraffeassessoria.com.br",
  leadDestination: "",
  retention: "",
  legalBasis: "",
  dpo: "",
  address: "",
  hosting: "",
  serverLogs: "",
};

const requiredFields = ["updatedAt", "legalName", "cnpj", "contactEmail", "leadDestination", "retention", "legalBasis"] as const;

/** Campos obrigatórios ainda vazios. */
export const privacyPolicyMissing = requiredFields.filter((field) => !privacyPolicy[field].trim());
export const privacyPolicyComplete = privacyPolicyMissing.length === 0;
