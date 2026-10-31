# Implementação da página de vendas

## Direção aplicada

Página editorial para donos de oficinas e centros automotivos. O eixo visual é a passagem de contato para venda: texto de grande escala, fotografia editorial ilustrativa, divisórias secas, seções claras e escuras e o método em laranja. A paleta usa `#FF6400`, `#111111`, `#FFFFFF`, `#F5F5F5` e `#737373`. Geist e Geist Mono vêm de `next/font`. O layout é responsivo e prioriza leitura em coluna no celular.

O hero usa uma imagem **gerada por IA e ilustrativa**, sem representar cliente, equipe ou instalação real da Giraffe. Prompt final: “Photorealistic editorial landscape photograph of an independent automotive repair shop with mechanic working on open car hood, dark left half for website headline, orange accent light, credible documentary style, no text or logos.” Ferramenta: imagegen integrada. A versão WebP servida no site tem aproximadamente 67 KB. Substituir por fotografia licenciada e autorizada quando disponível.

## Movimento

- Entrada curta de título, subtítulo e CTAs no hero.
- Revelação de blocos por `IntersectionObserver`, com conteúdo visível antes de o JavaScript iniciar.
- Etapas do método com `animation-timeline: view()` nos navegadores compatíveis, com apresentação estática como fallback.
- Hover e foco discretos em links, botões e FAQ nativa com `details/summary`.
- `prefers-reduced-motion` desliga o movimento; as faixas de logos ficam estáticas e roláveis. Não há vídeo em autoplay, pin ou GSAP.

## Referências e limites

A auditoria anterior em [DESIGN.md](DESIGN.md) registra capturas da Terminal Industries em desktop e mobile. Nesta implementação, a referência foi consultada novamente pelo conteúdo público; o navegador local não ficou disponível para uma nova inspeção interativa. Não foi fornecida a imagem do mapa do site mencionada no briefing. A ordem das dez seções segue o texto anexado. Nenhum asset da Terminal foi usado.

## Conteúdo e operação

Consulte [CONTENT.md](CONTENT.md) para dados ainda necessários. A integração de leads usa `POST /api/leads` e envia JSON a `LEAD_WEBHOOK_URL` no servidor. Não existe simulação de sucesso. O envio exige a URL da política de privacidade e o destino configurados. O formulário tem validação nativa e no servidor, campo armadilha, tempo mínimo de preenchimento e captura de UTMs. É uma proteção básica; uma operação pública com volume alto deve acrescentar rate limiting no perímetro.

`NEXT_PUBLIC_INDEXABLE` mantém a página fora de indexação por padrão. Ative apenas após revisão comercial, jurídica, de conteúdo e integração. Sem URL pública confirmada, canonical, Open Graph URL e sitemap ficam ausentes.

O `Dockerfile` usa a saída `standalone` do Next.js e foi preparado para um futuro deploy em Coolify. As variáveis públicas entram no build; credenciais do webhook entram apenas no runtime. Docker não foi executado nesta etapa.

O formulário também emite eventos `diagnosis_step`, `lead_submit_success` e `lead_submit_error` para `window.dataLayer` somente quando essa camada existir. Nenhum dado pessoal é enviado nesses eventos; a instalação de um gerenciador de tags depende de decisão posterior.

## Verificação executada

- TypeScript e build de produção passaram após os ajustes.
- Chrome headless com emulação de viewport confirmou ausência de scroll horizontal em 360, 390, 768, 1024 e 1440 px. O CTA principal ficou dentro da primeira dobra em 360 e 390 px.
- Capturas locais de hero, cases, método, FAQ e diagnóstico foram inspecionadas em mobile. A entrada animada foi observada após seu término.
- As 24 âncoras internas verificadas apontaram para IDs existentes.
- `POST /api/leads` sem configuração respondeu 503; `robots.txt` retornou `Disallow: /`.
- No build de produção, o menu móvel abriu com `aria-expanded=true`, moveu o foco para o primeiro link e fechou com Escape devolvendo foco ao botão. O primeiro item do FAQ abriu pelo controle nativo. O formulário avançou para a segunda etapa com campos válidos e mostrou erro, sem sucesso falso, quando a integração estava ausente. Nenhuma exceção de runtime apareceu nessa sequência.
- O formulário com webhook real, inspeção completa do console, movimento reduzido e métricas de campo ainda exigem validação antes do GO.

## Antes de publicar

1. Revisar aplicação da logo fornecida, fotografia, contatos, redes e política de privacidade.
2. Revisar “Método Giraffe” e escopo real de cada solução.
3. Revisar os logos fornecidos e incluir cases e vídeos somente com dados verificáveis.
4. Configurar e testar o webhook, proteção contra abuso e o fluxo de resposta ao lead.
5. Validar visualmente 360, 390, 768, 1024 px e desktop amplo; medir Core Web Vitals em tráfego real.
6. Configurar URL pública e só então habilitar indexação.
