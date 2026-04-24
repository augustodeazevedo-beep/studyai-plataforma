import { motion } from "framer-motion";
import { Check, Crown, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const plans = [
  {
    name: "Gratuito",
    icon: Zap,
    price: "R$ 0",
    period: "para sempre",
    description: "Comece a estudar com inteligência, sem compromisso.",
    features: [
      "Planejamento inteligente básico",
      "Revisões espaçadas (limitadas)",
      "Dashboard de evolução",
      "1 edital ativo",
      "Acesso à comunidade",
    ],
    cta: "Começar Grátis",
    highlighted: false,
  },
  {
    name: "Premium",
    icon: Crown,
    price: "Em breve",
    period: "",
    description: "Para quem não quer deixar a aprovação para a sorte.",
    features: [
      "IA ilimitada (Coach + Professor)",
      "Revisões espaçadas ilimitadas",
      "Simulados com análise detalhada",
      "Editais ilimitados",
      "Suporte prioritário",
      "Predição de desempenho",
    ],
    cta: "Garantir Vaga",
    highlighted: true,
  },
];

const PricingSection = () => (
  <section className="py-20 px-4" id="pricing">
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
          Invista na sua <span className="text-gradient">aprovação</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Comece grátis e evolua quando estiver pronto. Sem surpresas, sem letras miúdas.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className={`glass rounded-2xl p-8 relative flex flex-col ${
              plan.highlighted ? "border-primary/50 ring-1 ring-primary/20" : ""
            }`}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i + 1}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                Mais Popular
              </div>
            )}

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                plan.highlighted ? "bg-primary/20" : "bg-primary/10"
              }`}>
                <plan.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            </div>

            <div className="mb-2">
              <span className="font-display text-3xl font-bold">{plan.price}</span>
              {plan.period && (
                <span className="text-muted-foreground text-sm ml-2">{plan.period}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              size="lg"
              variant={plan.highlighted ? "default" : "outline"}
              className={`w-full ${plan.highlighted ? "glow" : ""}`}
            >
              <Link to="/auth?tab=signup">
                {plan.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
