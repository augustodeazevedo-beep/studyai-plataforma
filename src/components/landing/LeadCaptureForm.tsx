import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const LeadCaptureForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setForm((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe seu nome.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(
        "https://fhgayxeqwrbnnxwqvcwd.supabase.co/functions/v1/lead-ingestion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: form.name.trim(),
            email: form.email.trim() || null,
            telefone: form.phone.replace(/\D/g, "") || null,
            mensagem: form.message.trim() || null,
            projeto: "cognos",
            fonte: "instagram_landing",
          }),
        }
      );

      if (!res.ok) throw new Error("Erro ao enviar");

      setIsSuccess(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-xl">
          <motion.div
            className="glass rounded-2xl p-10 text-center border-primary/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle className="h-14 w-14 text-primary mx-auto mb-5" />
            <h3 className="font-display text-2xl font-bold mb-3">
              Mensagem enviada!
            </h3>
            <p className="text-muted-foreground">
              Obrigado pelo interesse no COGNOS. Entraremos em contato em breve!
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => setIsSuccess(false)}
            >
              Enviar outra mensagem
            </Button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="contato" className="py-20 px-4">
      <div className="container mx-auto max-w-xl">
        <motion.div
          className="text-center mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <MessageCircle className="h-8 w-8 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-3">
            Fale com o <span className="text-gradient">COGNOS</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Deixe seus dados e conte qual concurso você está estudando. Vamos te
            ajudar a traçar a melhor rota.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-6 sm:p-8 space-y-5 border-primary/20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
        >
          <div className="space-y-2">
            <Label htmlFor="lead-name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lead-name"
              name="name"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-email">E-mail</Label>
            <Input
              id="lead-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-phone">WhatsApp (com DDD)</Label>
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              placeholder="(99) 99999-9999"
              value={form.phone}
              onChange={handlePhoneChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead-message">
              Qual concurso você está estudando?
            </Label>
            <Textarea
              id="lead-message"
              name="message"
              placeholder="Ex.: Concurso da Polícia Federal, TRT, INSS..."
              value={form.message}
              onChange={handleChange}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            className="w-full glow"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Enviando..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </motion.form>
      </div>
    </section>
  );
};

export default LeadCaptureForm;
