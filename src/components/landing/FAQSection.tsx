import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Preciso pagar para usar?",
    answer:
      "Não. O Study.AI tem um plano gratuito com acesso às funcionalidades essenciais — planejamento inteligente, revisões espaçadas, dashboard G-Force e módulos de IA. Planos pagos desbloqueiam recursos avançados como IA ilimitada e suporte prioritário.",
  },
  {
    question: "Funciona para qual concurso?",
    answer:
      "Para qualquer concurso público do Brasil. Você envia o PDF do edital e a IA extrai automaticamente disciplinas, tópicos, relevância e incidência, montando um plano personalizado. Federal, estadual, municipal, tribunais, polícias, área fiscal — tudo funciona.",
  },
  {
    question: "O que são os 5 vetores G-Force?",
    answer:
      "São as 5 dimensões que a IA analisa para tomar decisões: Relevância (peso no edital), Incidência (frequência em provas), Compreensão (seu domínio real), Intensidade (horas dedicadas) e Psique (estado emocional/cognitivo). Juntos, eles formam o \"sensor\" que guia toda a estratégia da plataforma.",
  },
  {
    question: "Como funciona o suporte a neurodivergência?",
    answer:
      "O Study.AI foi projetado com foco em estudantes com TDAH, TEA, dislexia e outras condições. A anamnese captura seu perfil cognitivo. O Pomodoro é editável de 1 a 120 min. Em dias de baixa energia, a IA reduz a carga automaticamente e prioriza formatos leves. A linguagem nunca é punitiva — sempre empática e encorajadora.",
  },
  {
    question: "Preciso abandonar meu material atual?",
    answer:
      "De jeito nenhum. O Study.AI integra com seus materiais existentes — PDFs, apostilas, videoaulas. Você organiza tudo dentro da plataforma e o sistema cria a estratégia em cima do que você já usa.",
  },
  {
    question: "A IA realmente se adapta ao meu dia emocional?",
    answer:
      "Sim. Através dos check-ins diários na aba Bem-Estar (humor, estresse, energia, foco), a IA ajusta em tempo real o volume de estudo recomendado, o tipo de atividade e até a linguagem das respostas. Em dias difíceis, o foco é consistência mínima — porque um dia leve ainda é melhor que um dia zerado.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const FAQSection = () => (
  <section className="py-20 px-4" id="faq">
    <div className="container mx-auto max-w-3xl">
      <motion.div
        className="text-center mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <div className="inline-flex items-center gap-2 mb-4">
          <HelpCircle className="h-6 w-6 text-primary" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
        </div>
        <p className="text-muted-foreground">
          Tire suas dúvidas antes de começar.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
      >
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="glass rounded-xl px-6 border-border/50"
            >
              <AccordionTrigger className="font-display text-sm sm:text-base font-semibold hover:no-underline text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQSection;
