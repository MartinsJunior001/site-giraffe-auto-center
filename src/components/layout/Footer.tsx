import Image from "next/image";
import Link from "next/link";
import { privacyPolicyPath } from "@/content/privacy";
import { siteName } from "@/content/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <a className="footer-brand" href="#inicio" aria-label="Giraffe Assessoria, voltar ao início">
            <Image
              className="footer-logo"
              src="/images/logos/logo-giraffe-assessoria-branca.png"
              alt=""
              width={360}
              height={133}
            />
          </a>
          <p>Marketing e estratégia para oficinas e centros automotivos.</p>
        </div>
        <div>
          <span className="label">NAVEGAÇÃO</span>
          <a href="#solucoes">Soluções</a>
          <a href="#faq">Perguntas frequentes</a>
          <a href="#diagnostico">Diagnóstico</a>
        </div>
        <div>
          <span className="label">CONTATO</span>
          <p>Os canais oficiais de contato serão publicados após confirmação.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {siteName}</span>
        <Link href={privacyPolicyPath}>Política de privacidade</Link>
      </div>
    </footer>
  );
}
