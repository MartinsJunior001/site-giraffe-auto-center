import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TrustedBy, About, PainPoints, Benefits, CaseStudies, Solutions, WhyGiraffe, FAQ } from "@/components/sections/Sections";
import { Diagnosis } from "@/components/sections/Diagnosis";
import { CinematicHero } from "@/components/hero/CinematicHero";

export default function Home() {
  return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo"><CinematicHero /><TrustedBy /><About /><CaseStudies /><PainPoints /><Benefits /><Solutions /><WhyGiraffe /><FAQ /><Diagnosis /></main><Footer /></>;
}
