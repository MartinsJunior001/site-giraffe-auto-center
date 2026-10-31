import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero, TrustedBy, PainPoints, Benefits, CaseStudies, GiraffeMethod, Solutions, WhyGiraffe, FAQ } from "@/components/sections/Sections";
import { Diagnosis } from "@/components/sections/Diagnosis";

export default function Home() {
  return <><a className="skip-link" href="#conteudo">Pular para o conteúdo</a><Header /><main id="conteudo"><Hero /><TrustedBy /><PainPoints /><Benefits /><CaseStudies /><GiraffeMethod /><Solutions /><WhyGiraffe /><FAQ /><Diagnosis /></main><Footer /></>;
}
