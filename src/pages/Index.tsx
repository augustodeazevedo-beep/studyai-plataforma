import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Target, TrendingUp, Clock, BarChart3, Shield, ArrowRight, Sparkles, BookOpen, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "IA que Estuda com Você",
    description: "Chega de cronograma genérico. A IA analisa 5 dimensões do seu aprendizado e monta um plano sob medida — que se adapta a cada sessão.",
  },
  {
    icon: Clock,
    title: "Nunca Mais Esqueça o que Estudou",
    description: "Revisões espaçadas baseadas em neurociência garantem que o conteúdo fique na memória de longo prazo — exatamente quando a banca vai cobrar.",
  },
  {
    icon: Target,
    title: "Estude o que Mais Cai",
    description: "Cruza relevância, incidência em provas anteriores e suas lacunas de conhecimento para priorizar o que realmente importa na sua aprovação.",
  },
  {
    icon: BarChart3,
    title: "Veja sua Evolução Real",
    description: "Dashboard com métricas claras: horas estudadas, taxa de acerto, radar de competências e projeção de quando você estará pronto.",
  },
  {
    icon: BookOpen,
    title: "Tudo em Um Só Lugar",
    description: "PDFs, questões, flashcards e anotações integrados ao seu plano. Sem alternar entre 10 apps — foco total no que importa.",
  },
  {
    icon: Shield,
    title: "Seus Dados, Sua Privacidade",
    description: "Criptografia de ponta a ponta e conformidade LGPD. Seu desempenho e dados pessoais nunca são compartilhados.",
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
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo-cognos.png" alt="COGNOS Study.AI" className="h-8 w-8 object-contain" />
            <span className="font-display text-lg font-bold text-foreground">
              COGNOS <span className="text-primary">Study.AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
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

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              A plataforma de estudos que aprovados recomendam
            </div>
          </motion.div>

          <motion.h1
            className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Pare de estudar{" "}
            <span className="text-gradient">no escuro.</span>
            <br />
            Sua aprovação tem{" "}
            <span className="text-gradient">método.</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Enquanto outros estudam mais horas, você vai estudar de forma mais inteligente.
            IA + neurociência para concurseiros que não podem perder mais tempo.
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
              <a href="#features">Conhecer Recursos</a>
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
              { value: "5", label: "Vetores de Priorização" },
              { value: "∞", label: "Revisões Inteligentes" },
              { value: "100%", label: "Dados Protegidos" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
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
              Por que concurseiros escolhem o <span className="text-gradient">COGNOS</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Cada recurso foi desenhado para resolver os problemas reais de quem estuda para concurso — não para impressionar investidores.
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
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div
            className="glass rounded-2xl p-8 sm:p-12 text-center max-w-3xl mx-auto relative overflow-hidden"
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
                Você já perdeu tempo demais
                <br />
                <span className="text-gradient">estudando sem direção.</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Sem cobranças tóxicas. Sem culpa. O COGNOS respeita seu ritmo, mas não te deixa estagnar.
                É o equilíbrio entre empatia e alta performance.
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

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/logo-cognos.png" alt="COGNOS" className="h-6" />
            <span>© 2026 COGNOS Study.AI — Todos os direitos reservados</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
            <a href="#" className="hover:text-foreground transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
