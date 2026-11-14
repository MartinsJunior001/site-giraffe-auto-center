# Integração do formulário com Make e Google Sheets

**Situação (14/11/2026):** o site está pronto e foi testado localmente com um simulador do Make. A conexão real (cenário no Make e planilha) ainda não foi criada, então a integração **não está aprovada**: só conta depois de um envio real aparecer na planilha.

## Como funciona

Formulário → `POST /api/leads` (servidor do site) → webhook do Make → Google Sheets "Add a row" → resposta do Make → `/obrigado`.

- O navegador só fala com `/api/leads`. A URL e a chave do webhook ficam no servidor (`LEAD_WEBHOOK_URL` e `LEAD_WEBHOOK_TOKEN`) e nunca aparecem no código enviado ao navegador.
- A chave vai no cabeçalho `x-make-apikey` (autenticação por chave de API do webhook do Make).
- Só conta como gravado quando o Make responde **200** com `{"ok": true, "leadId": "<o mesmo leadId enviado>"}`. Um "200 Accepted" (cenário sem resposta, agendado ou que passou de 180 s), erro 500 (falha na planilha) ou mais de 20 s de espera viram erro: o visitante continua no formulário com a mensagem "Não foi possível enviar agora".
- Cada envio leva um `leadId` (UUID) que se mantém nas novas tentativas. O servidor não reenvia um `leadId` já gravado nos últimos 30 minutos nem um envio em andamento.
- Em produção, a URL do webhook precisa ser HTTPS, e o formulário fica bloqueado (503) enquanto a política de privacidade (`src/content/privacy.ts`) estiver incompleta. No `next dev` essa trava não se aplica, para permitir o teste real.
- Falhas vão para o log só com o motivo técnico e os 8 primeiros caracteres do `leadId`, sem dados pessoais.

Código: `src/lib/lead-service.ts` (envio e confirmação), `src/app/api/leads/route.ts` (validação, antispam, duplicados) e `src/components/sections/DiagnosisForm.tsx` (gera o `leadId`).

## Campos enviados ao Make

| Campo | Conteúdo |
|---|---|
| `leadId` | identificador único do envio |
| `submittedAt` | data e hora em ISO (UTC) |
| `submittedAtLocal` | data e hora de Brasília, ex.: `14/11/2026, 16:16:01` |
| `name`, `phone`, `email`, `company` | nome, WhatsApp com DDD, e-mail e nome da oficina |
| `role` | função (Proprietário, Sócio, Gerente, Responsável comercial ou Outro) |
| `revenue`, `revenueLabel` | faixa de faturamento (código e texto) |
| `landingPage` | página em que o formulário foi enviado |
| `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` | parâmetros de campanha do link (vazios se não houver) |
| `consent` | sempre `true` (o envio só acontece com o aviso de privacidade) |

## Retomar: passo a passo

### 1. Planilha Google
1. Crie a planilha **Leads — Giraffe Assessoria**.
2. Na linha 1: Data e hora · ID do lead · Nome · WhatsApp · E-mail · Nome da oficina · Função · Faixa de faturamento · Página de origem · UTM Source · UTM Medium · UTM Campaign · UTM Content · UTM Term.
3. Compartilhe só com quem precisa ver os contatos.

### 2. Make: webhook
1. **Scenarios → Create a new scenario**.
2. **+ → Webhooks → Custom webhook → Create a webhook** (nome: "Leads site Giraffe").
3. Em **API Key authentication**: **Add API key → Create a keychain**, com uma chave longa e aleatória. Guarde-a: o Make não mostra de novo.
4. Copie a URL do webhook.
5. Clique em **Redetermine data structure** para o Make esperar um envio de exemplo (o passo 5 faz esse envio).

### 3. Make: gravar e responder
1. **+ → Google Sheets → Add a row**. Em **Connection**, clique em **Add** e entre com a conta Google (a conexão não existe ainda). Escolha a planilha e a aba, com **Table contains headers: Yes**.
2. Mapeie: Data e hora ← `submittedAtLocal` · ID do lead ← `leadId` · Nome ← `name` · WhatsApp ← `phone` · E-mail ← `email` · Nome da oficina ← `company` · Função ← `role` · Faixa de faturamento ← `revenueLabel` · Página de origem ← `landingPage` · UTMs ← `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`.
3. **+ → Webhooks → Webhook response**, por último: **Status** `200`; cabeçalho `Content-Type: application/json`; **Body** `{"ok": true, "leadId": "{{1.leadId}}"}` (escolha `leadId` do módulo 1 no mapeamento).
4. Opcional (segunda barreira contra duplicados): antes do "Add a row", **Google Sheets → Search rows** pelo ID do lead, com filtro para só gravar quando nada for encontrado.
5. **Save**, agendamento **Immediately** e cenário **ON**.

### 4. Variáveis
- **Teste local:** crie `.env.local` na raiz (já está no `.gitignore`) com `LEAD_WEBHOOK_URL=<URL do webhook>` e `LEAD_WEBHOOK_TOKEN=<chave>`, e reinicie o `npm run dev`.
- **Coolify:** as mesmas duas variáveis como **variáveis de execução secretas** (sem marcar "variável de build").
- Nunca coloque esses valores em arquivos do repositório nem em variáveis `NEXT_PUBLIC_*`.

### 5. Teste real (obrigatório antes de aprovar)
1. Com o `next dev` usando o `.env.local`, envie o formulário com dados fictícios e um link com UTMs (ex.: `/?utm_source=teste&utm_medium=cpc&utm_campaign=lancamento`).
2. Confira: a página foi para `/obrigado`, a linha apareceu na planilha e cada coluna tem o valor certo.
3. Teste de falha: desligue o cenário no Make e envie de novo. O formulário deve mostrar "Não foi possível enviar agora" e não ir para `/obrigado`.
4. Apague as linhas de teste da planilha.

### 6. Depois do teste real
- Atualizar a política de privacidade: destino dos contatos ("Planilhas Google, por meio da plataforma Make"), prazo de guarda, base legal validada e data da versão. Com todos os campos obrigatórios preenchidos, o formulário é liberado em produção.
- Cadastrar as variáveis no Coolify, publicar e repetir o teste real no domínio oficial.

## Teste local com o simulador (já feito em 14/11/2026)

Com um simulador do webhook (mesmas respostas documentadas pelo Make): sucesso com os 17 campos e UTMs; falha 500 sem ir para `/obrigado` e nova tentativa com o mesmo `leadId`; "200 Accepted", `leadId` diferente e demora de 25 s tratados como erro; mesmo `leadId` duas vezes chegando uma vez só; `leadId` inválido, campo anti-robô e envio rápido demais recusados; URL e chave ausentes do código enviado ao navegador.
