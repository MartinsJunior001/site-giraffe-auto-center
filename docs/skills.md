# Skills do projeto

Seleção feita em 30/10/2026 para o scaffold Next.js 16.4.3, React 19.3.0,
Tailwind CSS 4 e TypeScript 5. A aplicação ainda não usa banco de dados,
GSAP, Coolify, shadcn/ui nem um serviço de hospedagem configurado.

## Instaladas

| Skill | Uso neste projeto | Codex | Claude Code |
| --- | --- | --- | --- |
| `vercel-react-best-practices` | Implementação e revisão de páginas React/Next.js | `.agents/skills/` | `.claude/skills/` |
| `vercel-composition-patterns` | Decisões concretas sobre componentes reutilizáveis | `.agents/skills/` | `.claude/skills/` |
| `web-design-guidelines` | Revisão da interface e acessibilidade | `.agents/skills/` | `.claude/skills/` |
| `writing-guidelines` | Revisão de textos e documentação | `.agents/skills/` | `.claude/skills/` |
| `find-skills` | Busca de capacidades adicionais quando houver necessidade | global, já disponível | `.claude/skills/` |

As quatro primeiras são cópias integrais de `vercel-labs/agent-skills`,
revisão `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`. Os nomes instalados
seguem o campo `name` do `SKILL.md`; as referências e regras dentro das pastas
foram mantidas. As duas skills de React trazem a indicação `license: MIT` no
frontmatter original. `find-skills` veio de `vercel-labs/skills`, revisão
`92a9a34ac3bf88e695e468b90c7bf32f163d32c8`, com o arquivo `LICENSE` MIT
copiado para sua pasta. Fontes e atribuições permanecem nos arquivos originais.
No Windows, as cópias por cliente evitam links absolutos e devem ser atualizadas
juntas a partir da mesma revisão.

## Reutilizadas e dispensadas

`find-skills` e `frontend-design` já estão disponíveis no Codex; `frontend-design`
também está disponível no Claude Code. Não foram recriadas. A instalação local
de `find-skills` atende apenas ao Claude Code.

As skills `gsap-*`, `mysql-best-practices` e `coolify-best-practices` do toolkit
não se aplicam à stack atual. Também não há necessidade presente de skills para
deploy/Vercel, transições, métricas de produção, React Native, PostgreSQL,
shadcn/ui, correção de CI ou revisão diferencial de segurança. `next-dev-loop`
depende de `agent-browser`, não encontrado no PATH; `next-bundle-optimizer` fica
para uma auditoria de bundle solicitada. Claude-Mem não foi instalado.

## Verificação e manutenção

As quatro pastas compartilhadas foram comparadas por hash com a origem, incluindo
76 arquivos de React, 14 de composição e um arquivo em cada skill de revisão:
nenhuma divergência. Uma nova sessão `codex exec --sandbox read-only` listou as
quatro skills locais. Uma nova sessão `claude -p` listou as mesmas quatro e
`find-skills`. Isso confirma descoberta dos nomes, não execução de seus fluxos.

Para atualizar, compare os commits acima com as fontes oficiais, releia os
`SKILL.md` e licenças, substitua as pastas completas nos dois clientes e repita
a comparação de hashes e a verificação em sessões novas. A CLI `npx skills`
não ficou disponível nesta instalação, então a cópia foi feita diretamente
dos repositórios oficiais. A consulta ao Context7 falhou por credencial inválida;
nenhuma configuração global foi alterada.
