import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Brain, Target, TrendingUp, Clock, BarChart3, Shield, ArrowRight, Sparkles, BookOpen, Zap, Heart, GraduationCap, MessageCircle, LayoutGrid, Check, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import LeadCaptureForm from "@/components/landing/LeadCaptureForm";
import EcosystemSection from "@/components/landing/EcosystemSection";
import BrandLogo from "@/components/brand/BrandLogo";
import { ADVOCACY_APPS } from "@/data/advocacyApps";
import heroBg from "@/assets/hero-bg.jpg";
import ctaBg from "@/assets/cta-bg.jpg";
import featuresBg from "@/assets/features-bg.jpg";
import advocacyLogo from "@/assets/advocacy-ai-logo.png";

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { question: "Preciso pagar para usar?", answer: "Não. O Study.AI tem um plano gratuito com acesso às funcionalidades essenciais — planejamento inteligente, revisões espaçadas, dashboard G-Force e módulos de IA. Planos pagos desbloqueiam recursos avançados como IA ilimitada e suporte prioritário." },
    { question: "Funciona para qual concurso?", answer: "Para qualquer concurso público do Brasil. Você envia o PDF do edital e a IA extrai automaticamente disciplinas, tópicos, relevância e incidência, montando um plano personalizado." },
    { question: "O que são os 5 vetores G-Force?", answer: "São as 5 dimensões que a IA analisa para tomar decisões: Relevância, Incidência, Compreensão, Intensidade e Psique. Juntos formam o sensor que guia toda a estratégia da plataforma." },
    { question: "Como funciona o suporte a neurodivergência?", answer: "O Study.AI foi projetado com foco em estudantes com TDAH, TEA, dislexia e outras condições. A anamnese captura seu perfil cognitivo, o Pomodoro é editável de 1 a 120 min e a carga é reduzida em dias difíceis, sempre com linguagem empática." },
    { question: "Preciso abandonar meu material atual?", answer: "Não. O Study.AI integra com seus materiais existentes — PDFs, apostilas, videoaulas — e cria a estratégia em cima do que você já usa." },
    { question: "A IA realmente se adapta ao meu dia emocional?", answer: "Sim. Através dos check-ins diários (humor, estresse, energia, foco), a IA ajusta em tempo real o volume de estudo, o tipo de atividade e a linguagem das respostas." },
  ].map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const features = [
  {
    icon: Brain,
    title: "Motor de Decisão Pedagógica",
    description: "Não conta horas — maximiza aprendizado por unidade de carga cognitiva. A IA analisa 5 vetores do seu perfil e decide o quê, como e quando estudar.",
  },
  {
    icon: Clock,
    title: "Revisões que Vencem o Esquecimento",
    description: "Sistema SRS adaptativo com intervalos que se ajustam ao seu desempenho e ao seu dia emocional. Nos dias difíceis, a carga é aliviada — nunca eliminada.",
  },
  {
    icon: Target,
    title: "G-Force: Seu Sensor de Prioridades",
    description: "Radar de 5 vetores (Relevância, Incidência, Compreensão, Intensidade e Psique) que identifica lacunas e direciona seu esforço para onde dá mais resultado.",
  },
  {
    icon: Heart,
    title: "Projetado para Neurodivergentes",
    description: "Anamnese cognitiva, Pomodoro de 1 a 120 min, micro-metas, linguagem sem culpa e carga adaptável. TDAH, TEA e dislexia são considerados em cada decisão da IA.",
  },
  {
    icon: GraduationCap,
    title: "Professor + Coach + Previsor",
    description: "Três módulos de IA especializados: tire dúvidas, receba feedback estratégico com diagnóstico G-Force e projete cenários realistas de aprovação.",
  },
  {
    icon: Shield,
    title: "Arsenal Inteligente de Edital",
    description: "Envie o PDF do edital e a IA monta o grafo de conhecimento: disciplinas, tópicos, relevância, incidência e pré-requisitos — tudo automatizado.",
  },
];

const howItWorks = [
  {
    step: "01",
    icon: Heart,
    title: "Conheça-se",
    description: "Preencha a anamnese neurocognitiva. A IA precisa saber quem você é — não apenas o que estuda.",
  },
  {
    step: "02",
    icon: Shield,
    title: "Mapeie o Território",
    description: "Faça upload do edital. A IA extrai disciplinas, tópicos e monta seu grafo de conhecimento personalizado.",
  },
  {
    step: "03",
    icon: BookOpen,
    title: "Estude com Propósito",
    description: "A cada sessão, a IA recomenda o alvo (disciplina) e o formato (flashcard, simulado, resumo) com base no seu estado atual.",
  },
  {
    step: "04",
    icon: BarChart3,
    title: "Evolua com Dados",
    description: "O G-Force rastreia suas lacunas em tempo real. O Coach.IA corrige a rota. O Previsor.IA projeta quando você estará pronto.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const Index = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Helmet>
        <title>Study.AI — Planejamento inteligente para concursos</title>
        <meta name="description" content="Motor de decisão pedagógica com IA e neurociência para concursos. Planos adaptativos, revisões espaçadas e suporte a neurodivergência." />
        <link rel="canonical" href="https://studyai-byadvocacyai.lovable.app/" />
        <meta property="og:title" content="Study.AI — Planejamento inteligente para concursos" />
        <meta property="og:description" content="IA + neurociência para maximizar seu aprendizado por unidade de carga cognitiva." />
        <meta property="og:url" content="https://studyai-byadvocacyai.lovable.app/" />
        <script type="application/ld+json">{JSON.stringify(FAQ_JSON_LD)}</script>
      </Helmet>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3" aria-label="Study.AI">
            <BrandLogo size="nav" imgClassName="max-w-[148px] sm:max-w-[170px]" />
          </Link>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Apps</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-xl p-3">
                <div className="px-2 pb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Ecossistema
                  </p>
                  <p className="text-base font-display font-bold">
                    Advocacy<span className="text-primary">.AI</span>
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {ADVOCACY_APPS.map(({ name, url, description, Icon, active }) => {
                    const content = (
                      <>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-primary/15 text-primary" : "bg-muted/50 text-foreground/80"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className="truncate">
                              {name}<span className="text-primary">.AI</span>
                            </span>
                            {active ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{description}</p>
                        </div>
                      </>
                    );
                    const baseClasses = "flex items-center gap-3 rounded-lg border px-2.5 py-2 transition-colors";
                    if (active) {
                      return (
                        <div key={name} className={`${baseClasses} border-primary/40 bg-primary/10`} aria-current="page">
                          {content}
                        </div>
                      );
                    }
                    return (
                      <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${baseClasses} border-transparent hover:border-border hover:bg-muted/40`}
                      >
                        {content}
                      </a>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild className="glow">
              <Link to="/auth?tab=signup">
                Começar Grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      <main>
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4">
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img src={heroBg} alt="" width="1920" height="1080" fetchPriority="high" decoding="async" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm text-muted-foreground">
              <Brain className="h-4 w-4 text-primary" />
              Motor de inteligência pedagógica para concursos
            </div>
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Não estude{" "}
            <span className="text-gradient">mais horas.</span>
            <br />
            Estude com{" "}
            <span className="text-gradient">mais inteligência.</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            O Study.AI não é um cronograma. É um motor de decisão pedagógica que maximiza seu aprendizado por unidade de carga cognitiva — com empatia, neurociência e respeito ao seu ritmo.
          </motion.p>

          <motion.p
            className="text-sm text-primary/80 max-w-xl mx-auto mb-10 italic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Projetado especialmente para estudantes neurodivergentes e para quem não pode mais perder tempo com métodos genéricos.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button size="lg" asChild className="glow text-base px-8 py-6">
              <Link to="/auth?tab=signup">
                <Zap className="mr-2 h-5 w-5" />
                Criar Conta Gratuita
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base px-8 py-6">
              <a href="#how-it-works">Como Funciona</a>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            {[
              { value: "5", label: "Vetores G-Force" },
              { value: "3", label: "Módulos de IA" },
              { value: "∞", label: "Revisões Adaptativas" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Philosophy Banner */}
      <section className="py-16 px-4 relative">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="glass rounded-2xl p-8 sm:p-10 text-center border-primary/20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-4">
              O que torna o Study.AI <span className="text-gradient">diferente?</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              A maioria das plataformas te diz <strong className="text-foreground">quando</strong> estudar. O Study.AI te diz <strong className="text-foreground">o quê</strong> estudar, <strong className="text-foreground">como</strong> estudar e <strong className="text-foreground">por quê</strong> — com base no seu estado real de conhecimento, desempenho e bem-estar emocional. Toda recomendação é pedagógica, empática, realista e baseada nos seus dados.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img src={featuresBg} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        <div className="container mx-auto relative z-10">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">
              O Ciclo <span className="text-gradient">Study.AI</span>
            </h2>
            <p className="font-display text-lg sm:text-xl text-primary font-semibold mb-4 italic">
              "Aqui, todos os caminhos levam à sua Aprovação."
            </p>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Quatro etapas que se retroalimentam. Você alimenta o sistema com dados honestos — a IA transforma em estratégia de aprovação.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                className="glass rounded-xl p-6 text-center relative group hover:border-primary/30 transition-colors"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="text-4xl font-display font-bold text-primary/20 mb-2">{item.step}</div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:glow transition-shadow">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Arquitetura pensada para <span className="text-gradient">sua aprovação</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Cada recurso foi projetado sobre neurociência do aprendizado, teoria da carga cognitiva e sistemas adaptativos — não para impressionar, mas para funcionar.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="glass rounded-xl p-6 hover:border-primary/30 transition-colors group"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:glow transition-shadow">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Motivational CTA */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img src={ctaBg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        </div>
        <div className="container mx-auto relative z-10">
          <motion.div
            className="glass rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto relative overflow-hidden border-primary/20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
                Chega de estudar{" "}
                <span className="text-gradient">no escuro.</span>
              </h2>
              <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
                O Study.AI não cobra, não pune, não gera culpa. Ele entende seu ritmo, respeita seus dias difíceis e te guia com clareza quando você está pronto para avançar.
              </p>
              <p className="text-sm text-primary/80 italic mb-8 max-w-md mx-auto">
                "Vamos ajustar a rota" — nunca "você deveria ter feito mais".
              </p>
              <Button size="lg" asChild className="glow">
                <Link to="/auth?tab=signup">
                  Começar Agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <EcosystemSection />

      <PricingSection />

      {/* Lead Capture */}
      <LeadCaptureForm />

      {/* FAQ */}
      <FAQSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col gap-6 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo size="footer" imgClassName="max-w-[130px]" />
              <span>© 2026 Study.AI — Todos os direitos reservados</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground">by</span>
            <a
              href="https://advocacy.ai"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Advocacy.AI"
              className="inline-flex items-center transition-opacity hover:opacity-80"
            >
              <img
                src={advocacyLogo}
                alt="Advocacy.AI"
                loading="lazy"
                decoding="async"
                className="h-7 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
