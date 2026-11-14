// Opções do formulário de diagnóstico. O servidor valida as respostas contra estas mesmas listas.
// value é o que vai para o webhook; label é o texto exibido no formulário.
export const roleOptions = [
  { value: "Proprietário", label: "Sou proprietário(a)" },
  { value: "Sócio", label: "Sou sócio(a)" },
  { value: "Gerente", label: "Sou gerente" },
  { value: "Responsável comercial", label: "Sou responsável pelo comercial" },
  { value: "Outro", label: "Outro" },
] as const;

export const revenueOptions = [
  { value: "ate-20k", label: "Até R$ 20 mil/mês" },
  { value: "20k-40k", label: "R$ 20 mil a R$ 40 mil/mês" },
  { value: "40k-60k", label: "R$ 40 mil a R$ 60 mil/mês" },
  { value: "60k-100k", label: "R$ 60 mil a R$ 100 mil/mês" },
  { value: "100k-150k", label: "R$ 100 mil a R$ 150 mil/mês" },
  { value: "150k-200k", label: "R$ 150 mil a R$ 200 mil/mês" },
  { value: "acima-200k", label: "Acima de R$ 200 mil/mês" },
  { value: "nao-informado", label: "Prefiro não informar" },
] as const;

export const thankYouPath = "/obrigado";
export const giraffeWebsite = "https://giraffeassessoria.com.br";

// Página de obrigado ---------------------------------------------------------
// WhatsApp da Giraffe: só dígitos, com 55 + DDD + número (ex.: "5511999999999").
// Enquanto estiver vazio, o botão e o redirecionamento do fim do vídeo levam ao site da Giraffe.
export const whatsappNumber = "5516996227258";
export const whatsappMessage = "Olá! Acabei de preencher o diagnóstico no site da Giraffe e quero falar com um especialista.";

// Vídeo de boas-vindas: arquivo em public/ (ex.: "/videos/boas-vindas.mp4"), capa opcional
// e vertical: true para vídeos em pé (9:16). Enquanto src estiver vazio, aparece um espaço reservado.
// PROVISÓRIO: depoimento da Giga Max até chegar o vídeo de boas-vindas oficial.
export const thankYouVideo: { src: string; poster?: string; vertical?: boolean } = {
  src: "/videos-clientes/giga.max.ribeirão.preto.mp4",
  poster: "/images/videos/giga-max-ribeirao-preto.jpg",
  vertical: true,
};

export const whatsappSiteMessage = "Olá! Vim pelo site da Giraffe e quero saber mais sobre a assessoria.";

export function whatsappUrl(message = whatsappSiteMessage) {
  return whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}` : null;
}

export function thankYouCta() {
  return whatsappNumber
    ? { href: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`, label: "Falar com a Giraffe no WhatsApp", destination: "o WhatsApp da Giraffe" }
    : { href: giraffeWebsite, label: "Conhecer a Giraffe", destination: "o site da Giraffe" };
}
