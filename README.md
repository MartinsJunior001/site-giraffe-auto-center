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
- `LEAD_WEBHOOK_URL`: endpoint HTTPS que recebe POST JSON, apenas no servidor.
- `LEAD_WEBHOOK_TOKEN`: token Bearer opcional, apenas no servidor.

O envio não grava dados localmente. Sem webhook ou com a política de privacidade incompleta, `/api/leads` responde 503. Não coloque tokens em variáveis `NEXT_PUBLIC_*`. O formulário preserva UTMs e URL de origem no payload.

Se houver uma camada `window.dataLayer` configurada, o formulário publica eventos de etapa, sucesso e erro sem dados pessoais. Nenhuma ferramenta de analytics é carregada por padrão.

## Verificação

```bash
npm run lint
npx tsc --noEmit
npm run build
```

O lint usa a configuração oficial do Next.js (`eslint.config.mjs`). Não há suíte de testes. Veja [implementação](docs/IMPLEMENTATION.md), [conteúdo pendente](docs/CONTENT.md), [auditoria visual](docs/DESIGN.md) e [plano de movimento](docs/MOTION.md).

## Publicação

Ainda não houve deploy. O `Dockerfile` produz um servidor standalone na porta 3000. Configuração prevista no Coolify (projeto `pagina-de-vendas-giraffe`, ambiente de produção):

- Build: `Dockerfile` do repositório, branch `main`, porta 3000.
- Domínios: `https://giraffeassessoria.com.br` (principal) e `https://www.giraffeassessoria.com.br`, redirecionando para o principal, com SSL automático.
- Variáveis de build (públicas, entram no código enviado ao navegador): `NEXT_PUBLIC_SITE_URL=https://giraffeassessoria.com.br` e `NEXT_PUBLIC_INDEXABLE=true`.
- Variáveis de execução (secretas, só no servidor; não marque como variável de build): `LEAD_WEBHOOK_URL` e, se o destino exigir, `LEAD_WEBHOOK_TOKEN`.

A política de privacidade fica em `/politica-de-privacidade` e é preenchida em `src/content/privacy.ts`. Enquanto houver campo obrigatório vazio, a página mostra os trechos "a confirmar" e o formulário não aceita envios em produção. Antes de publicar: completar a política, cadastrar o webhook e fazer um envio real de teste.
