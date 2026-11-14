import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteName, siteUrl } from "@/content/site";
import { privacyPolicy as policy, privacyPolicyComplete, privacyPolicyPath } from "@/content/privacy";

// Só aparece nas buscas quando o site é público e a política está completa (veja src/content/privacy.ts).
const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "true" && privacyPolicyComplete;

export const metadata: Metadata = {
  title: `Política de Privacidade | ${siteName}`,
  description: "Como a Giraffe Assessoria trata os dados pessoais enviados pelo formulário de diagnóstico deste site.",
  robots: { index: indexable, follow: indexable },
  ...(siteUrl ? { alternates: { canonical: privacyPolicyPath } } : {}),
};

/** Trecho que depende de confirmação da Giraffe (some quando o campo é preenchido em src/content/privacy.ts). */
function Pending({ children }: { children: ReactNode }) {
  return <mark className="policy-pending">a confirmar: {children}</mark>;
}

function Field({ value, pending }: { value: string; pending: string }) {
  return value.trim() ? <>{value.trim()}</> : <Pending>{pending}</Pending>;
}

function ContactEmail() {
  const email = policy.contactEmail.trim();
  return email ? <a href={`mailto:${email}`}>{email}</a> : <Pending>e-mail para assuntos de dados pessoais</Pending>;
}

export default function PrivacyPolicyPage() {
  const domain = siteUrl ? new URL(siteUrl).host : "giraffeassessoria.com.br";
  return <main className="policy">
    <div className="policy-inner">
      <Link className="policy-brand" href="/" aria-label={`${siteName}, voltar à página inicial`}>
        <Image src="/images/logos/logo-giraffe-assessoria-preta.svg" alt="" width={160} height={59} unoptimized priority />
      </Link>
      <h1>Política de Privacidade</h1>
      <p className="policy-updated">Última atualização: <Field value={policy.updatedAt} pending="data desta versão" /></p>
      {privacyPolicyComplete ? null : <p className="policy-draft" role="note">Rascunho: os trechos destacados dependem de confirmação da Giraffe antes da publicação.</p>}

      <h2>1. Quem é responsável pelos seus dados</h2>
      <p>
        Esta política explica como a <Field value={policy.legalName} pending="razão social" />, inscrita no CNPJ <Field value={policy.cnpj} pending="CNPJ" />
        {policy.address.trim() ? <>, com sede em {policy.address.trim()}</> : null} (“Giraffe Assessoria”), trata os dados pessoais enviados por meio deste site ({domain}).
      </p>
      <p>
        Para qualquer assunto sobre os seus dados, fale com a gente pelo e-mail <ContactEmail />.
        {policy.dpo.trim() ? <> O encarregado pelo tratamento de dados pessoais é {policy.dpo.trim()}.</> : null}
      </p>

      <h2>2. Quais dados coletamos</h2>
      <p>Quando você preenche o formulário de diagnóstico, recebemos:</p>
      <ul>
        <li>seu nome, e-mail e número de WhatsApp;</li>
        <li>o nome da oficina;</li>
        <li>sua função na empresa e a faixa de faturamento mensal (com a opção “Prefiro não informar”).</li>
      </ul>
      <p>
        Junto com essas respostas, registramos o endereço da página em que você preencheu o formulário e, quando o link de acesso tiver,
        os parâmetros de campanha (UTM), que indicam por qual anúncio ou canal você chegou.
      </p>
      <p>
        Para bloquear envios automáticos (robôs), o site também verifica o tempo de preenchimento e um campo oculto do formulário.
        Essas duas informações são usadas só no momento do envio e não são guardadas.
      </p>
      {policy.serverLogs.trim() ? <p>{policy.serverLogs.trim()}</p> : null}
      <p>O site não usa cookies de análise ou de publicidade e não instala ferramentas de rastreamento.</p>

      <h2>3. Para que usamos os dados</h2>
      <p>
        Usamos os dados do formulário para que a equipe da Giraffe entre em contato com você sobre o diagnóstico e os nossos serviços,
        como informado no próprio formulário. Os parâmetros de campanha servem para sabermos por quais canais os contatos chegam.
      </p>
      <p>Base legal: <Field value={policy.legalBasis} pending="base legal na LGPD" />.</p>

      <h2>4. Com quem os dados são compartilhados</h2>
      <p>
        Ao enviar o formulário, os dados seguem do servidor do site diretamente para <Field value={policy.leadDestination} pending="ferramenta que recebe os contatos (CRM, automação ou outra)" />,
        usada pela equipe da Giraffe para organizar o atendimento. O site não guarda uma cópia dos dados enviados.
        {policy.hosting.trim() ? <> O site é hospedado em {policy.hosting.trim()}.</> : null}
      </p>
      <p>Dois recursos do site são de terceiros e só entram em ação quando você os usa:</p>
      <ul>
        <li>
          <strong>Vídeos de depoimentos:</strong> usam o player do YouTube no modo de privacidade aprimorada. Nada é carregado do YouTube até você clicar em um vídeo;
          a partir daí, o Google pode coletar dados conforme a <a href="https://policies.google.com/privacy?hl=pt-BR" target="_blank" rel="noopener noreferrer">Política de Privacidade do Google</a>.
        </li>
        <li>
          <strong>WhatsApp:</strong> os botões abrem uma conversa no WhatsApp, que segue a <a href="https://www.whatsapp.com/legal/privacy-policy?lang=pt_BR" target="_blank" rel="noopener noreferrer">política de privacidade do WhatsApp</a>.
        </li>
      </ul>

      <h2>5. Por quanto tempo guardamos os dados</h2>
      <p><Field value={policy.retention} pending="prazo de guarda dos contatos e o que acontece depois (exclusão ou anonimização)" /></p>

      <h2>6. Seus direitos</h2>
      <p>Pela Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), você pode pedir a qualquer momento:</p>
      <ul>
        <li>a confirmação de que tratamos seus dados e o acesso a eles;</li>
        <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei;</li>
        <li>a portabilidade dos dados a outro fornecedor de serviço;</li>
        <li>a eliminação dos dados tratados com o seu consentimento e a revogação desse consentimento;</li>
        <li>informações sobre com quem compartilhamos seus dados e sobre a possibilidade de não dar consentimento e suas consequências.</li>
      </ul>
      <p>
        Para exercer esses direitos, escreva para <ContactEmail />. Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>7. Segurança</h2>
      <p>A conexão com o site é protegida (HTTPS). Os dados do formulário não ficam guardados no site: seguem direto para a ferramenta de atendimento da Giraffe.</p>

      <h2>8. Alterações nesta política</h2>
      <p>Esta política pode ser atualizada. A data da versão em vigor fica no início desta página.</p>

      <Link className="button button-orange policy-back" href="/">Voltar ao site</Link>
    </div>
  </main>;
}
