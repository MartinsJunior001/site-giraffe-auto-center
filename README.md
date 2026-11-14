# Página de vendas Giraffe

Landing page em Next.js 16, React 19, TypeScript e Tailwind CSS 4 para a Giraffe Assessoria. O código principal está na branch `main`.

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. No Windows PowerShell, use `Copy-Item .env.example .env.local`. A página pode ser visualizada sem variáveis configuradas; o formulário de diagnóstico (modal de 4 etapas) informará que o envio está indisponível. Com envio bem-sucedido, a pessoa é levada a `/obrigado`.

## Configuração

- `NEXT_PUBLIC_SITE_URL`: domínio público confirmado, sem barra final.
- `NEXT_PUBLIC_INDEXABLE`: mantenha `false` até aprovação para publicação.
- `NEXT_PUBLIC_PRIVACY_URL`: URL pública da política aprovada, exigida para aceitar leads.
- `LEAD_WEBHOOK_URL`: endpoint HTTPS que recebe POST JSON, apenas no servidor.
- `LEAD_WEBHOOK_TOKEN`: token Bearer opcional, apenas no servidor.

O envio não grava dados localmente. Sem política e webhook, `/api/leads` responde 503. Não coloque tokens em variáveis `NEXT_PUBLIC_*`. O formulário preserva UTMs e URL de origem no payload.

Se houver uma camada `window.dataLayer` configurada, o formulário publica eventos de etapa, sucesso e erro sem dados pessoais. Nenhuma ferramenta de analytics é carregada por padrão.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
```

O lint usa a configuração oficial do Next.js (`eslint.config.mjs`). Não há suíte de testes. Veja [implementação](docs/IMPLEMENTATION.md), [conteúdo pendente](docs/CONTENT.md), [auditoria visual](docs/DESIGN.md) e [plano de movimento](docs/MOTION.md).

## Publicação

Não houve deploy. O `Dockerfile` produz um servidor standalone na porta 3000 para a futura configuração no Coolify. `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_INDEXABLE` e `NEXT_PUBLIC_PRIVACY_URL` são argumentos de build; `LEAD_WEBHOOK_URL` e `LEAD_WEBHOOK_TOKEN` devem ser definidos somente no ambiente de execução. Antes de publicar, confirme conteúdo, contatos, privacidade, integração de leads, imagens e provas sociais.
