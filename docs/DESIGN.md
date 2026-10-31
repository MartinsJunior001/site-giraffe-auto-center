# Direção visual proposta — página de vendas Giraffe

> Registro histórico da auditoria de 30/10/2026. A implementação atual está descrita em [IMPLEMENTATION.md](IMPLEMENTATION.md); observações abaixo sobre ausência de implementação referem-se ao estado anterior.

**Status:** auditoria e plano para aprovação; sem implementação. **Projeto de destino:** `pagina-de-vendas-giraffe`. **Referência:** [Terminal Industries](https://terminal-industries.com/), página inicial consultada em 30/10/2026 (America/Sao_Paulo). O projeto ainda é o scaffold de Next.js 16.4.3, React 19.3.0, TypeScript e Tailwind CSS 4; não há conteúdo comercial, identidade visual ou navegação Giraffe implementados. O plano preserva essa stack.

## Evidência e limites

Foram inspecionados o HTML e os estilos públicos servidos pela página atual, capturas da primeira dobra e capturas da página inteira via [Microlink Screenshot API](https://microlink.io/docs/api/parameters/screenshot), solicitadas em 1440×900 px (desktop) e 390×844 px (mobile). Uma captura adicional abriu o menu mobile por clique automatizado. As capturas são **quadros isolados**, possivelmente em momentos diferentes da sequência do hero; não medem scroll, hover nem duração. Em captura de página inteira, áreas `sticky` e elementos dependentes de scroll podem aparecer vazios ou desbotados sem representar a leitura real. O navegador local não concluiu a inspeção interativa. Capturas de premiações encontradas na busca mostram versões anteriores e não foram usadas como prova da página atual. Antes de implementar, conferir a referência em navegador real nos três tamanhos, com rolagem, toque, teclado e movimento reduzido.

### Fatos verificados na página atual

| Aspecto | Evidência observada |
| --- | --- |
| Hierarquia | A abertura contém três frases editoriais em sequência; depois aparecem logos, três caminhos de entrada, calculadora, explicação do produto, passos de benefícios, plataforma, depoimento, contato e FAQ. |
| Quadro desktop, 1440×900 | Header flutuante cinza translúcido com logo, categorias e três CTAs; fotografia ampla de caminhão ao entardecer ocupa a primeira dobra. Um título branco de grande escala cruza a imagem e a área preta inferior, com pequeno acento verde lima e indicação de rolagem centralizada embaixo. A captura pegou uma frase em transição, portanto seu corte não define a composição final. |
| Quadro mobile, 390×844 | Header compacto com logo e ícone de menu; o caminhão é recortado com o veículo no centro/direita, sobre gradiente claro e base preta. O frame não exibe a frase do hero; isso **não prova** que ela esteja ausente no mobile. Há um widget de chat sobreposto no canto inferior. |
| Página inteira, desktop/mobile | Três cards lado a lado no desktop passam a pilha vertical no mobile. Calculadora e resultado ficam em duas colunas no desktop e empilhados no mobile. A seção de benefícios combina texto e mídia em colunas no desktop e vira mídia seguida de controles/etapas no mobile. Tabs e cards de plataforma permanecem horizontais com controles de carrossel. Contato e FAQ também mudam de duas colunas para fluxo vertical. O rodapé escuro tem transição superior arredondada. Espaços brancos muito altos e textos apagados na captura inteira podem ser estados de animação sem scroll, não espaçamento final pretendido. |
| Navegação | Header fixo no CSS; categorias `System`, `Markets`, `Featured`, `Resources` e link `About`, com menus de conteúdo. O HTML inclui navegação mobile separada e botão com `aria-expanded`/`aria-controls`. No quadro após clique, o menu mobile abre como painel escuro pela direita sobre fundo atenuado, com links grandes, setas e ação inferior. O widget de chat sobrepõe a região inferior desse painel no quadro; o comportamento de foco/Esc não foi testado. |
| Tipografia | Estilos declaram Suisse Intl (400/450/500/600) e Geist Mono. Títulos usam peso regular, linha curta e entrelinha apertada; rótulos e dados têm tratamento compacto. As fontes da referência não serão copiadas. |
| Layout e espaçamento | CSS declara container com margens laterais fluidas, grade que muda de duas para doze colunas e breakpoints em 768 e 1024 px. A abertura tem conteúdo `sticky` de `100svh` dentro de um trecho de `300svh`. Esses valores são do CSS, não dimensões renderizadas medidas. |
| Cor | Tokens da referência incluem branco, verde escuro, lima e laranja. O contraste entre áreas claras, blocos escuros, mídia e texto grande define o ritmo. |
| Máscaras e mídia | O HTML inclui `clipPath`/`mask` SVG e separadores com recorte; quatro elementos de vídeo MP4 aparecem com `muted`, `loop` e `playsinline`, sem `autoplay` no HTML inicial. Há imagens responsivas em elementos `picture`. |
| Microinterações | O CSS contém estados de menu mobile, entrada de dropdown, hover/foco de navegação e botões, além de uma regra de `prefers-reduced-motion`. A execução e os tempos percebidos não foram observados. |

### Hipóteses a confirmar em navegador

- A sequência da abertura pode trocar textos e enquadramento conforme a rolagem; o `sticky` e o trecho alto sugerem isso, mas não provam pin, scrub nem duração.
- Os recortes SVG podem revelar a mídia na passagem entre seções. Forma, velocidade e ordem percebidas ainda não foram verificadas.
- O painel mobile ocupa grande parte da largura no quadro aberto; bloqueio de rolagem, foco e fechamento por Esc continuam sem verificação.
- Os vídeos podem iniciar por JavaScript quando entram na área visível. Os atributos do HTML não provam reprodução automática.
- Escala, corte, espaçamentos finais e legibilidade em 375/768/1440 px precisam de capturas ao vivo e interativas; dois frames estáticos não substituem essa inspeção, especialmente na sequência do hero.

## Tradução para a identidade Giraffe

**Ideia:** “visão que abre caminho”. Uma linha laranja original atravessa áreas escuras e claras, muda de escala e enquadra conteúdo real da Giraffe. Ela sugere direção e alcance sem reproduzir wireframes industriais, caminhões, máscaras, vídeos ou composições da Terminal. Na fase desta auditoria, a logo oficial ainda não havia sido fornecida; o arquivo foi incorporado depois. Não reconstruir uma logo a partir da referência.

| Sistema provisório | Decisão proposta |
| --- | --- |
| Cor | Laranja `#FF6400`, preto `#111111`, branco `#FFFFFF`, todos provisórios. Usar preto para texto sobre laranja e sobre branco; laranja em branco como detalhe gráfico ou com texto preto associado, sujeito a teste de contraste. Os tokens ainda não foram aplicados ao CSS. |
| Tipo | Grotesca licenciada com título regular de grande escala e corpo confortável; rótulos curtos em peso médio. O scaffold já usa Geist via `next/font`; ela pode servir como base provisória enquanto se decide a tipografia de marca. Não distribuir Suisse Intl da referência. |
| Grade | Desktop: composição editorial em 12 colunas, com título amplo e mídia própria em contraponto. Tablet: reduzir sobreposições. Mobile: uma coluna de leitura, margens de cerca de 20–24 px como ponto de partida, títulos sem corte e CTA visível. Medidas finais após comparação em viewport. |
| Ritmo | Hero escuro de alto impacto → proposta de valor em fundo claro → benefícios e evidências reais → oferta e CTA. A ordem depende do conteúdo comercial confirmado; não alongar artificialmente a página. |
| Navegação | Definir âncoras e CTA a partir da oferta real da página de vendas. O scaffold não tem header/menu de produto; criar apenas a navegação necessária, com foco visível e links funcionais. |
| Imagens e vídeo | Somente mídia Giraffe original/licenciada e provas autorizadas, com corte responsivo, poster, dimensões reservadas e versão estática. Não usar qualquer asset da Terminal. |

## Ordem sugerida após aprovação

1. Confirmar paleta, oferta, público, CTA, logo e mídia com o responsável pela marca; decidir se Geist atende ou se outra fonte licenciada será necessária.
2. Capturar a referência atual e o scaffold Giraffe em 375, 768 e 1440 px; registrar diferenças reais de layout, navegação e movimento. Se a referência mudar, atualizar este diagnóstico.
3. Após aprovação, criar tokens, hero e navegação em uma primeira seção completa sobre o Next.js/Tailwind existentes. Conferir conteúdo e mídia antes de publicá-los; não inventar serviços, clientes ou resultados.
4. Aplicar o plano de `docs/MOTION.md` por efeito, com fallback estático. Validar foco, toque, movimento reduzido, legibilidade e métricas antes da próxima seção.

Fontes técnicas para a futura implementação: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/), [MDN: movimento reduzido](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion).
