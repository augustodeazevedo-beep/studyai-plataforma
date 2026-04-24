import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Camila R.",
    role: "Aprovada — Analista do TRF-3",
    text: "Eu estudava 10h por dia e não via resultado. Com o Study.AI, em 4 meses consegui focar no que realmente caía na prova. Passei em 7º lugar.",
    stars: 5,
  },
  {
    name: "Lucas M.",
    role: "Aprovado — Auditor Fiscal SEFAZ-BA",
    text: "O sistema de revisão espaçada mudou minha vida. Parei de esquecer o que estudava e minha taxa de acerto nos simulados subiu de 58% para 82%.",
    stars: 5,
  },
  {
    name: "Ana Paula S.",
    role: "Aprovada — Técnica do INSS",
    text: "Tenho TDAH e sempre tive dificuldade com cronogramas rígidos. O Study.AI respeita meu ritmo sem me deixar parada. Foi a ferramenta que faltava.",
    stars: 5,
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

const TestimonialsSection = () => (
  <section className="py-20 px-4">
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
          Quem usa, <span className="text-gradient">aprova</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Histórias reais de concurseiros que transformaram sua rotina de estudos com o Study.AI.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            className="glass rounded-xl p-6 relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i + 1}
          >
            <Quote className="h-8 w-8 text-primary/20 absolute top-4 right-4" />
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
            <div>
              <p className="font-display font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-primary">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
