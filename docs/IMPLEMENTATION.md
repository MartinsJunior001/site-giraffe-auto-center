# Implementação da página de vendas

## Direção aplicada

Página editorial para donos de oficinas e centros automotivos. O eixo visual é a passagem de contato para venda: texto de grande escala, fotografia editorial ilustrativa, divisórias secas e seções claras e escuras. A paleta usa `#FF6400`, `#111111`, `#FFFFFF`, `#F5F5F5` e `#737373`. Geist e Geist Mono vêm de `next/font`. O layout é responsivo e prioriza leitura em coluna no celular.

O hero é uma apresentação cinematográfica da mesma oficina vista do alto (câmera B, aprovada na Fase 1), que evolui em 5 estados. As quatro imagens de `public/images/hero/cinematic/` (2688×1520) foram **geradas por IA e são ilustrativas**, sem representar cliente, equipe ou instalação real da Giraffe. São a imagem-mãe (`oficina-base.jpg`, usada nos estados 0 e 1) e três evoluções editadas a partir dela com o mesmo enquadramento (Higgsfield `gpt_image_2_6` e composição local por máscaras). Logos e emblemas foram removidos. Substituir por fotografia licenciada e autorizada quando disponível. A imagem do hero anterior (`public/images/hero/workshop-editorial.webp`) não é mais usada.

## Movimento

- Hero cinematográfico com GSAP (detalhes abaixo).
- Revelação de blocos por `IntersectionObserver`, com conteúdo visível antes de o JavaScript iniciar.
- Hover e foco discretos em links, botões e FAQ nativa com `details/summary`.
- `prefers-reduced-motion` desliga o movimento; as faixas de logos ficam estáticas e roláveis. Não há vídeo em autoplay nem pin. GSAP e ScrollTrigger são usados só no hero.

## Hero cinematográfico

**Arquivos**

- `src/components/hero/CinematicHero.tsx`: orquestra etapas, textos, interfaces, progresso, "Pular introdução" e acessibilidade.
- `src/components/hero/HeroScene.tsx`: a cena (camadas de imagem e câmera). O resto do hero só conversa com ela por `transition`, `set` e `ready`.
- `src/components/hero/useStepGestures.ts`: transforma roda, trackpad, toque e teclado em uma etapa por gesto.
- `src/components/hero/heroConfig.ts`: tempos e sensibilidade.
- `src/components/hero/cinematic-hero.css`: estilos do hero (prefixo `ch-`).
- `src/content/hero.ts`: textos, imagens, interfaces e posições dos elementos presos à imagem.

**Comportamento**

- 5 estados e 4 avanços, um por gesto: roda, trackpad, deslize, setas, PageUp/PageDown e Espaço. Rolagem forte e inércia de trackpad não pulam etapas: a inércia de um gesto não troca de novo, e gestos iniciados durante uma troca são descartados.
- Trackpad: depois que a troca termina, um gesto novo feito durante a inércia do anterior conta, porque volta a acelerar com clareza (a inércia só desacelera) ou muda de sentido. Assim, quem faz vários gestos seguidos não fica preso esperando a inércia acabar.
- Estado 4: a câmera recua para mostrar a oficina inteira. Enquanto o botão do hero está na tela, o botão do cabeçalho fica escuro (classe `ch-final` no `<html>`) e a barra 01–04 fica a 40%; ao rolar a página, tudo volta ao normal.
- O hero só intercepta a rolagem com a página no topo. No estado 4, rolar para baixo libera a página; no topo, rolar para cima volta uma etapa. Quem sai do hero no meio da apresentação (menu, barra de rolagem, link com `#`) encontra o estado final ao voltar. Com o formulário aberto, nada é interceptado.
- Movimento reduzido: só o estado final, parado. A rolagem é normal e só duas imagens são baixadas.
- Carregamento: o estado 0 tem prioridade alta; as imagens seguintes entram uma por vez, depois que a anterior termina. Só a camada do estado atual fica desenhada; as outras ficam com `visibility: hidden`.
- Telas grandes (acima de 1440 px): cabeçalho, hero e seções usam a mesma moldura, com margens laterais de 72 px e largura máxima de 1840 px (`--wide-gutter` e `--wide-max` em `globals.css`). A fotografia do hero continua ocupando a tela inteira; títulos e parágrafos mantêm a largura máxima de leitura. Até 1440 px, nada muda.
- Celular: a câmera desliza até o foco de cada cena (`mobileFocus`); o texto fica embaixo e os cartões no alto, à direita. O estado 0 abre na fileira de elevadores vazios, e a agenda mostra só os dois horários cujos carros aparecem no recorte.

**Ajustes**

- Sensibilidade da rolagem: `HERO_INPUT` em `heroConfig.ts` (`wheelThreshold`, `swipeThreshold`, `gestureGapMs`). O reconhecimento de gesto novo durante a inércia usa `newGestureDecay`, `newGestureRise` e `newGestureMinPx`.
- Duração das trocas: `HERO_MOTION` em `heroConfig.ts` (`transitionMs`, `skipMs`, `ease`). O zoom de cada estado fica em `cameraZoom` (nunca menor que 1).
- Textos: `heroScenes`, `heroEyebrow`, `heroCta` e `heroUi` em `src/content/hero.ts`. Trechos entre `*asteriscos*` ficam laranja.
- Imagens: `heroImages` em `src/content/hero.ts`. Mantenha 2688×1520 e o mesmo enquadramento; se o enquadramento mudar, revise `heroUi.anchors` e `mobileFocus`.

**Sequência de quadros (próxima fase):** criar outro componente de cena (por exemplo, `HeroFrames.tsx`, desenhando quadros num `<canvas>`) que implemente o mesmo `HeroSceneHandle`. Nele, `transition` devolve uma timeline que avança o índice do quadro, `set` desenha o quadro do estado e `ready` resolve quando os quadros do trecho estiverem carregados. Depois, basta trocar `HeroScene` por ele no `CinematicHero`. Gestos, textos, interfaces, progresso e acessibilidade continuam iguais.

## Globo da seção "Sobre nós"

A coluna da direita de "O que é a Giraffe" mostra um globo interativo no lugar da foto. Ele fica solto sobre o fundo branco da seção, sem cartão, moldura, sombra ou brilho embaixo, na mesma área e posição da foto.

- Arquivos: `src/components/globe/BrazilGlobe.tsx` (componente), `globeRenderer.ts` (desenho e interação, sem React), `globeConfig.ts` (enquadramento, zoom, velocidade e pontos) e `brazil-globe.css`.
- Técnica: projeção em perspectiva do d3-geo desenhada em `<canvas>` 2D, sem WebGL. O código (d3-geo e topojson-client) e os dados só são baixados quando a seção se aproxima da tela.
- Dados: `public/data/globo-brasil.json`, com o mundo em 1:110m e a América do Sul em 1:50m (Natural Earth, domínio público, via world-atlas 2.0.2). O Brasil usa a cor de `--orange`.
- Repouso: o globo não gira sozinho. Fica centralizado no Brasil e só se move enquanto a pessoa o arrasta, aproxima ou usa o teclado. Depois de 2,5 s sem interação, ele volta sozinho ao Brasil e ao zoom inicial. Com o cursor sobre o globo, a espera só começa quando o cursor sai. Com movimento reduzido, a volta é instantânea. O tempo de espera fica em `returnDelayMs`, em `globeConfig.ts`.
- Interação: só o globo responde; o espaço vazio em volta dele não gira o globo nem dá zoom. Arrastar gira; com o cursor parado sobre o globo, a rolagem aproxima ou afasta (entre 0,88× e 2,4×). Quem está rolando a página e passa pelo globo continua rolando, e nos limites do zoom a página volta a rolar. Com zoom, o mapa aparece numa janela redonda do tamanho do globo, que some suavemente na borda. No celular, deslizar na horizontal gira, na vertical rola a página, e a pinça aproxima. Pelo teclado: setas giram, + e − aproximam, Home volta ao Brasil.
- Desempenho: parado, o canvas não redesenha nada; o pulso do ponto principal é uma animação em CSS. A densidade de pixels fica limitada a 2, e o desenho pausa fora da tela e com a aba oculta.
- Os 8 pontos e arcos são ilustrativos (sem clientes, cidades ou números). Para mudar, edite `points` em `globeConfig.ts`; o primeiro é o ponto principal.
- Imagem estática: `public/images/sobre/globo-brasil.webp`, com fundo transparente, gerada a partir do próprio globo (quadrado do tamanho do menor lado da área). Aparece até o desenho carregar e fica no lugar se o JavaScript não rodar. Se o enquadramento mudar, gere a imagem de novo. O otimizador de imagens guarda cada versão por 4 horas e não tem como invalidar esse cache; para ver a imagem nova no `next dev`, apague `.next/dev/cache/images`.

## Depoimentos em vídeo

A galeria mostra cinco Shorts publicados no canal da Giraffe no YouTube: Casa do Freio (João Romanine), Brava Serviços Automotivos, Giga Max Ribeirão Preto, Marcão Auto Center e RL Pneus e Oficina. Os cinco ficam sempre na mesma fileira: lado a lado a partir de 1280 px de largura; abaixo disso, a fileira vira um carrossel de arrastar com encaixe por card.

- Dados: `src/content/testimonials.ts`. Cada card tem `youtubeId` (o trecho depois de `/shorts/` no link), `posterSrc` (capa), `avatarSrc`, `name`, `company`, `rating` e `quote`. Mantenha a citação entre 79 e 86 caracteres para ocupar 3 linhas. Sem `youtubeId`, o card vira espaço reservado e não abre o player.
- Capas e avatares ficam em `public/images/videos/`, servidos pelo próprio site. As capas da Brava, Giga Max, Marcão e RL Pneus são quadros dos vídeos; a da Casa do Freio é a miniatura oficial do Short. Nada é baixado do YouTube antes do clique.
- Ao clicar, abre um modal com o player oficial do YouTube no modo de privacidade aprimorada (`youtube-nocookie.com`). O player só é criado nessa hora e começa a tocar sozinho. Ao fechar (botão no canto da tela, Escape ou clique fora), o player sai da página, o vídeo para e o foco volta ao card. A moldura 9:16 tem tamanho fixo, com a capa por baixo enquanto o player carrega.
- O YouTube às vezes liga a legenda automática por cima da legenda gravada nos vídeos, e nenhum parâmetro da incorporação controla isso de forma confiável. Para evitar, desative a legenda automática desses Shorts no YouTube Studio.
- Os arquivos MP4 antigos em `public/videos-clientes/` não são mais usados e ficam fora do repositório.

## Referências e limites

A auditoria anterior em [DESIGN.md](DESIGN.md) registra capturas da Terminal Industries em desktop e mobile. Nesta implementação, a referência foi consultada novamente pelo conteúdo público; o navegador local não ficou disponível para uma nova inspeção interativa. Não foi fornecida a imagem do mapa do site mencionada no briefing. A seção do método foi retirada a pedido do cliente. Nenhum asset da Terminal foi usado.

## Conteúdo e operação

**Formulário de diagnóstico (13/11/2026):** o card da seção `#diagnostico` e todos os links para `#diagnostico` (topo, menu móvel, seções e rodapé) abrem um modal de 4 etapas; sem JavaScript, os links continuam levando à seção (`src/components/sections/DiagnosisForm.tsx`): função na empresa, faturamento médio mensal, contato (nome, e-mail, WhatsApp com DDD) e nome da oficina. As opções ficam em `src/content/diagnosis.ts` (função: o webhook recebe `Proprietário`, `Sócio`, `Gerente`, `Responsável comercial` ou `Outro`; faturamento: a faixa ou `nao-informado` para "Prefiro não informar"), e o servidor valida as respostas contra essas mesmas listas. Ao enviar com sucesso, a pessoa vai para `/obrigado`: página sem indexação com selo "Solicitação confirmada", a confirmação do pedido e o botão do WhatsApp. O vídeo de boas-vindas é opcional e hoje está vazio: com vídeo, a página pede para assisti-lo e, ao terminar, leva ao destino do botão; sem vídeo, não há player nem redirecionamento. Vídeo, número do WhatsApp e mensagem ficam em `src/content/diagnosis.ts`; sem número, o botão leva a https://giraffeassessoria.com.br. **Modo de teste:** no `next dev`, enquanto `LEAD_WEBHOOK_URL` estiver vazio, `/api/leads` valida os dados, não envia nada e responde sucesso (`test: true`), para permitir testar o fluxo até `/obrigado`; em produção esse atalho não existe. O envio usa `POST /api/leads`, que repassa ao webhook do Make (`LEAD_WEBHOOK_URL`, com a chave `LEAD_WEBHOOK_TOKEN` no cabeçalho `x-make-apikey`) um JSON plano: `leadId`, `submittedAt` (ISO), `submittedAtLocal` (horário de Brasília), `name`, `phone`, `email`, `company`, `role`, `revenue`, `revenueLabel`, `landingPage`, `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm` e `consent`. O cenário no Make é Custom Webhook → Google Sheets "Add a row" → Webhook Response com status 200 e corpo `{"ok": true, "leadId": "<leadId>"}`; só essa resposta conta como gravado (um "200 Accepted" do Make, a falha da planilha com 500 ou mais de 20 s de espera viram erro, e o visitante continua no formulário). O `leadId` é gerado no navegador ao enviar e se mantém nas novas tentativas; o servidor não reenvia um `leadId` já gravado nos últimos 30 minutos nem um envio em andamento. Em produção a URL do webhook precisa ser HTTPS. Falhas vão para o log só com o motivo técnico e o início do `leadId`. Sem `LEAD_WEBHOOK_URL`, ou com a política de privacidade incompleta, a rota responde 503 e o modal mostra o erro, sem levar ao obrigado.

**Política de privacidade (14/11/2026):** a página `/politica-de-privacidade` fica no próprio site, com link no rodapé do formulário (abre em nova aba, sem perder o preenchimento) e no rodapé da página. O texto descreve só o que o site faz de fato; os dados que dependem da Giraffe (razão social, CNPJ, e-mail para assuntos de dados, ferramenta que recebe os contatos, prazo de guarda, base legal e data) ficam em `src/content/privacy.ts`. Enquanto algum obrigatório estiver vazio, a página mostra o trecho destacado como "a confirmar", não é indexada, fica fora do sitemap, e `/api/leads` responde 503 em produção. A variável `NEXT_PUBLIC_PRIVACY_URL` deixou de existir. Eventos no `dataLayer`: `diagnosis_open`, `diagnosis_step`, `lead_submit_success` e `lead_submit_error`. O texto abaixo sobre o formulário antigo de duas etapas fica só como histórico.

Consulte [CONTENT.md](CONTENT.md) para dados ainda necessários. A integração de leads usa `POST /api/leads` e envia JSON a `LEAD_WEBHOOK_URL` no servidor. Não existe simulação de sucesso. O envio exige a URL da política de privacidade e o destino configurados. O formulário tem validação nativa e no servidor, campo armadilha, tempo mínimo de preenchimento e captura de UTMs. É uma proteção básica; uma operação pública com volume alto deve acrescentar rate limiting no perímetro.

`NEXT_PUBLIC_INDEXABLE` mantém a página fora de indexação por padrão. Ative apenas após revisão comercial, jurídica, de conteúdo e integração. Sem URL pública confirmada, canonical, Open Graph URL e sitemap ficam ausentes.

O `Dockerfile` usa a saída `standalone` do Next.js e foi preparado para um futuro deploy em Coolify. As variáveis públicas entram no build; credenciais do webhook entram apenas no runtime. Docker não foi executado nesta etapa.

O formulário também emite eventos `diagnosis_step`, `lead_submit_success` e `lead_submit_error` para `window.dataLayer` somente quando essa camada existir. Nenhum dado pessoal é enviado nesses eventos; a instalação de um gerenciador de tags depende de decisão posterior.

## Verificação executada

- TypeScript e build de produção passaram após os ajustes.
- Chrome headless com emulação de viewport confirmou ausência de scroll horizontal em 360, 390, 768, 1024 e 1440 px. O CTA principal ficou dentro da primeira dobra em 360 e 390 px.
- Capturas locais de hero, cases, FAQ e diagnóstico foram inspecionadas em mobile. A entrada animada foi observada após seu término.
- As âncoras internas foram verificadas para evitar links sem destino.
- `POST /api/leads` sem configuração respondeu 503; `robots.txt` retornou `Disallow: /`.
- No build de produção, o menu móvel abriu com `aria-expanded=true`, moveu o foco para o primeiro link e fechou com Escape devolvendo foco ao botão. O primeiro item do FAQ abriu pelo controle nativo. O formulário avançou para a segunda etapa com campos válidos e mostrou erro, sem sucesso falso, quando a integração estava ausente. Nenhuma exceção de runtime apareceu nessa sequência.
- Hero cinematográfico (13/11/2026): lint, TypeScript e build de produção passaram. No Chromium, em 1440×900, 390×844 e 844×390, foram testados roda (inclusive rajada forte e inércia de trackpad), toque, teclado, botões de progresso, "Pular introdução", liberação no estado 4, volta ao topo, saída no meio da apresentação e movimento reduzido. As trocas rodaram a 60 quadros por segundo; no build de produção, CLS 0 e nenhum erro no console. Faltam testes em iPhone e Android reais e em trackpad físico de Mac.
- Ajustes da revisão visual (13/11/2026), em sequências simuladas de trackpad: dois gestos com pausa, 2 etapas; segundo gesto durante a inércia, 2 etapas; quatro gestos seguidos sobre a inércia, 4 etapas; rolagem forte única (rajada, inércia longa, arrasto com ruído), sempre 1 etapa. Gestos feitos durante os 900 ms de uma troca continuam sendo ignorados. Mouse, toque e teclado sem mudança. Validado em 1366, 1440 e 1920 px e em 360×740, 360×800 e 390×844; no build de produção, CLS 0 e console sem erros.
- O formulário com webhook real, inspeção completa do console, movimento reduzido e métricas de campo ainda exigem validação antes do GO.

## Antes de publicar

1. Revisar aplicação da logo fornecida, fotografia, contatos, redes e política de privacidade.
2. Revisar o escopo real de cada solução.
3. Revisar os logos fornecidos e incluir cases e vídeos somente com dados verificáveis.
4. Configurar e testar o webhook, proteção contra abuso e o fluxo de resposta ao lead.
5. Validar visualmente 360, 390, 768, 1024 px e desktop amplo; medir Core Web Vitals em tráfego real.
6. Configurar URL pública e só então habilitar indexação.
