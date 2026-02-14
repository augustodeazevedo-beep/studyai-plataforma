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
      "Não. O COGNOS tem um plano gratuito que permite acessar as funcionalidades essenciais — planejamento, revisões espaçadas e dashboard de evolução. Planos pagos desbloqueiam recursos avançados como IA ilimitada, simulados com análise detalhada e suporte prioritário.",
  },
  {
    question: "Funciona para qual concurso?",
    answer:
      "Para qualquer concurso público do Brasil. Você cadastra as disciplinas do seu edital e a IA monta o plano personalizado. Funciona para concursos federais, estaduais, municipais, tribunais, polícias, área fiscal e muito mais.",
  },
  {
    question: "Como a Inteligência Artificial funciona?",
    answer:
      "A IA analisa 5 dimensões do seu aprendizado — relevância do tema, incidência em provas, seu nível de acurácia, desempenho e risco de esquecimento. Com esses dados, ela prioriza o que estudar, quando revisar e quanto tempo dedicar a cada matéria.",
  },
  {
    question: "Preciso abandonar meu material atual?",
    answer:
      "De jeito nenhum. O COGNOS integra com seus materiais existentes — PDFs, apostilas, videoaulas. Você organiza tudo dentro da plataforma e o sistema cria o cronograma em cima do que você já usa.",
  },
  {
    question: "É seguro colocar meus dados na plataforma?",
    answer:
      "Sim. Utilizamos criptografia de ponta a ponta, conformidade total com a LGPD e isolamento de dados. Seu desempenho, anotações e informações pessoais nunca são compartilhados com terceiros.",
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
