import { useEffect, useRef, type MouseEvent } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Smartphone,
  Thermometer,
  Wifi,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import coldGhostMark from "../../assets/cold-ghost-mark.jpeg";
import coldGhostSketch from "../../assets/cold-ghost-sketch.png";
import "./LandingPage.css";

const plans = [
  {
    name: "Básico",
    description: "Para pequenos negócios locais.",
    price: "R$ --,--",
    features: ["Até 2 equipamentos", "Dashboard web", "Alertas por e-mail"],
    featured: false,
    action: "Começar agora",
  },
  {
    name: "Profissional",
    description: "O melhor custo-benefício.",
    price: "R$ --,--",
    features: [
      "Até 5 equipamentos",
      "Alertas via WhatsApp",
      "Previsão de falhas",
      "Relatórios mensais",
    ],
    featured: true,
    action: "Escolher Profissional",
  },
  {
    name: "Empresarial",
    description: "Para redes e franquias.",
    price: "R$ --,--",
    features: [
      "Até 15 equipamentos",
      "Múltiplas filiais",
      "API de integração",
      "Suporte prioritário",
    ],
    featured: false,
    action: "Falar sobre este plano",
  },
  {
    name: "Corporativo",
    description: "Operações em grande escala.",
    price: "Sob Consulta",
    features: [
      "Equipamentos ilimitados",
      "Hardware customizado",
      "SLAs garantidos",
      "Gestor de conta",
    ],
    featured: false,
    action: "Solicitar proposta",
  },
];

function BrandMark({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <img
      className={`cold-ghost-mark ${className}`}
      src={coldGhostMark}
      alt=""
      aria-hidden="true"
    />
  );
}

export function LandingPage() {
  const pageRef = useRef<HTMLElement>(null);
  const revealObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (
      !page ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const targets = page.querySelectorAll<HTMLElement>("[data-scroll-reveal]");
    if (!targets.length) {
      return;
    }

    page.classList.add("scroll-reveal-enabled");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -36px 0px" },
    );

    revealObserverRef.current = observer;
    targets.forEach((target) => observer.observe(target));
    return () => {
      observer.disconnect();
      revealObserverRef.current = null;
      page.classList.remove("scroll-reveal-enabled");
    };
  }, []);

  function navigateToSection(event: MouseEvent<HTMLAnchorElement>, sectionId: string) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    const section = pageRef.current?.querySelector<HTMLElement>(`#${sectionId}`);
    if (!section) {
      return;
    }

    const scrollTarget = section;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      const observer = revealObserverRef.current;
      scrollTarget.querySelectorAll<HTMLElement>("[data-scroll-reveal]").forEach((target) => {
        observer?.unobserve(target);
        target.classList.remove("is-visible");
        observer?.observe(target);
      });
    }

    if (window.location.hash !== `#${sectionId}`) {
      window.history.pushState(null, "", `#${sectionId}`);
    }
    scrollTarget.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <main className="sales-page" ref={pageRef}>
      <header className="sales-header">
        <div className="sales-container sales-header-inner">
          <a className="sales-brand" href="#inicio" aria-label="Cold Ghost, início">
            <BrandMark />
            <span>Cold Ghost</span>
          </a>
          <nav className="sales-nav" aria-label="Navegação principal">
            <a href="#funcionalidades" onClick={(event) => navigateToSection(event, "funcionalidades")}>
              Funcionalidades
            </a>
            <a href="#planos" onClick={(event) => navigateToSection(event, "planos")}>
              Planos
            </a>
            <Link to="/cadastro">Cadastro</Link>
            <Link className="sales-nav-cta" to="/painel">Acessar Painel</Link>
          </nav>
        </div>
      </header>

      <section className="sales-hero" id="inicio">
        <div className="sales-container sales-hero-inner">
          <div className="sales-hero-copy">
            <div className="sales-live-badge">
              <span />
              Monitoramento inteligente da cadeia fria
            </div>
            <h1>
              Nunca mais perca estoque por{" "}
              <span>falha na refrigeração.</span>
            </h1>
            <p>
              Monitore temperatura e consumo de energia dos freezers e balcões
              do seu negócio. Identifique sinais de alerta e cuide melhor do
              seu estoque.
            </p>
            <div className="sales-hero-actions">
              <Link className="sales-button sales-button-primary" to="/cadastro">
                Quero proteger meu negócio <ArrowRight aria-hidden="true" />
              </Link>
              <div className="sales-proof">
                <span className="sales-proof-mark"><Check aria-hidden="true" /></span>
                <span>Mais controle para sua operação</span>
              </div>
            </div>
          </div>

          <div className="sales-dashboard-wrap" aria-label="Prévia ilustrativa do painel">
            <img className="sales-sketch-watermark" src={coldGhostSketch} alt="" />
            <div className="sales-dashboard">
              <div className="sales-dashboard-head">
                <div>
                  <span className="sales-dashboard-eyebrow">VISÃO DO SEU NEGÓCIO</span>
                  <h2>Consumo de equipamentos</h2>
                </div>
                <BrandMark className="sales-dashboard-mark" />
              </div>
              <div className="sales-dashboard-unit">ESTIMATIVA DE CONSUMO · kWh</div>
              <div className="sales-meter-row">
                <div className="sales-meter-label">
                  <span>Sorvetes 02 <i>Alerta</i></span><strong>816 kWh</strong>
                </div>
                <div className="sales-meter-track"><span className="sales-meter-danger" /></div>
              </div>
              <div className="sales-meter-row">
                <div className="sales-meter-label"><span>Carnes</span><strong>493 kWh</strong></div>
                <div className="sales-meter-track"><span className="sales-meter-normal sales-meter-60" /></div>
              </div>
              <div className="sales-meter-row">
                <div className="sales-meter-label"><span>Bebidas</span><strong>443 kWh</strong></div>
                <div className="sales-meter-track"><span className="sales-meter-normal sales-meter-54" /></div>
              </div>
              <div className="sales-alert">
                <Bell aria-hidden="true" />
                <p><strong>Atenção:</strong> perceba alterações no funcionamento antes que virem prejuízo.</p>
              </div>
              <span className="sales-preview-label">Prévia ilustrativa do painel</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sales-features" id="funcionalidades">
        <div className="sales-container">
          <div className="sales-section-heading" data-scroll-reveal>
            <span className="sales-eyebrow">MAIS SEGURANÇA PARA SUA OPERAÇÃO</span>
            <h2>Inteligência que ajuda a evitar prejuízos.</h2>
            <p>
              Um olhar atento para seus equipamentos, seus produtos e para os
              custos que pesam no fim do mês.
            </p>
          </div>
          <div className="sales-feature-grid">
            <article className="sales-feature-card" data-scroll-reveal>
              <span className="sales-feature-icon feature-teal"><Thermometer aria-hidden="true" /></span>
              <h3>Temperatura sob controle</h3>
              <p>Acompanhe as condições dos seus freezers e câmaras frias e proteja a qualidade dos produtos.</p>
            </article>
            <article className="sales-feature-card" data-scroll-reveal>
              <span className="sales-feature-icon feature-red"><Zap aria-hidden="true" /></span>
              <h3>Consumo de energia</h3>
              <p>Encontre equipamentos que podem estar elevando sua conta e investigue mudanças no consumo.</p>
            </article>
            <article className="sales-feature-card" data-scroll-reveal>
              <span className="sales-feature-icon feature-teal"><Bell aria-hidden="true" /></span>
              <h3>Alertas inteligentes</h3>
              <p>Saiba quando as leituras indicam mudanças que merecem sua atenção, sem precisar conferir tudo manualmente.</p>
            </article>
          </div>
          <p className="sales-estimate-note">
            As estimativas de consumo dependem dos dados coletados pelo equipamento e não substituem a medição da concessionária.
          </p>
        </div>
      </section>

      <section className="sales-how">
        <div className="sales-container">
          <div className="sales-section-heading" data-scroll-reveal>
            <span className="sales-eyebrow">DO EQUIPAMENTO À INFORMAÇÃO</span>
            <h2>Comece a monitorar em três passos.</h2>
          </div>
          <div className="sales-steps">
            <div className="sales-step-connector" />
            <article className="sales-step">
              <span className="sales-step-icon"><Wrench aria-hidden="true" /></span>
              <span className="sales-step-count">01</span>
              <h3>Instale o sensor</h3>
              <p>Use um sensor não invasivo no equipamento, sem interromper a rotina do seu negócio.</p>
            </article>
            <article className="sales-step">
              <span className="sales-step-icon step-highlight"><Wifi aria-hidden="true" /></span>
              <span className="sales-step-count">02</span>
              <h3>Conecte à rede</h3>
              <p>O módulo envia as leituras para que você acompanhe as condições dos seus equipamentos.</p>
            </article>
            <article className="sales-step">
              <span className="sales-step-icon"><Smartphone aria-hidden="true" /></span>
              <span className="sales-step-count">03</span>
              <h3>Acompanhe pelo painel</h3>
              <p>Consulte os indicadores e veja as informações importantes no celular ou computador.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="sales-plans" id="planos">
        <div className="sales-container">
          <div className="sales-section-heading">
            <span className="sales-eyebrow">PLANOS</span>
            <h2>Um plano para cada momento do seu negócio.</h2>
            <p>Comece com o essencial e amplie o monitoramento quando precisar.</p>
          </div>
          <div className="sales-plan-grid">
            {plans.map((plan) => (
              <article className={`sales-plan-card${plan.featured ? " plan-featured" : ""}`} data-scroll-reveal key={plan.name}>
                {plan.featured && <span className="sales-plan-badge">Recomendado</span>}
                <h3>{plan.name}</h3>
                <p className="sales-plan-description">{plan.description}</p>
                <div className="sales-plan-price">
                  <strong className={plan.price === "Sob Consulta" ? "price-contact" : ""}>{plan.price}</strong>
                  {plan.price !== "Sob Consulta" && <span>/mês</span>}
                </div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}><Check aria-hidden="true" />{feature}</li>
                  ))}
                </ul>
                <Link className={`sales-plan-button${plan.featured ? " plan-button-featured" : ""}`} to="/cadastro">
                  {plan.action}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sales-signup" id="cadastro">
        <div className="sales-signup-card">
          <div className="sales-signup-aside">
            <img src={coldGhostSketch} alt="" aria-hidden="true" />
            <div className="sales-signup-copy">
              <span className="sales-eyebrow">FRIOSENTINELA</span>
              <h2>Comece a proteger seu estoque hoje.</h2>
              <p>Conheça o painel e veja como a telemetria pode ajudar a cuidar da sua operação.</p>
              <ul>
                <li><span><Zap aria-hidden="true" /></span>Instalação simples</li>
                <li><span><Thermometer aria-hidden="true" /></span>Informações organizadas</li>
              </ul>
            </div>
          </div>
          <div className="sales-signup-action">
            <span className="sales-eyebrow">PRÓXIMO PASSO</span>
            <h3>Veja o Cold Ghost em ação.</h3>
            <p>
              Crie sua conta e cadastre sua empresa para começar a acompanhar
              seus equipamentos e as informações da sua operação.
            </p>
            <Link className="sales-button sales-button-dark" to="/cadastro">
              Criar minha conta <ArrowRight aria-hidden="true" />
            </Link>
            <span className="sales-signup-footnote">Crie sua conta e cadastre sua empresa para começar.</span>
          </div>
        </div>
      </section>

      <section className="sales-final-cta">
        <BrandMark />
        <h2>Pronto para cuidar melhor da sua cadeia fria?</h2>
        <p>Tenha mais visibilidade sobre seus equipamentos e tome decisões com mais confiança.</p>
        <Link className="sales-button sales-button-primary" to="/painel">
          Conhecer o painel <ChevronRight aria-hidden="true" />
        </Link>
      </section>

      <footer className="sales-footer">
        <div className="sales-container sales-footer-inner">
          <a className="sales-brand" href="#inicio">
            <BrandMark />
            <span>Cold Ghost</span>
          </a>
          <p>© {new Date().getFullYear()} Cold Ghost. Todos os direitos reservados.</p>
          <a href="#inicio">Voltar ao início <ArrowRight aria-hidden="true" /></a>
        </div>
      </footer>
    </main>
  );
}
