import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { ADVOCACY_APPS } from "@/data/advocacyApps";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const EcosystemSection = () => {
  return (
    <section id="ecossistema" className="py-20 px-4 relative">
      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          className="mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
        >
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-primary mb-4">
            Ecossistema Advocacy<span className="text-primary">.AI</span>
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-5 max-w-3xl">
            Faz parte de um <span className="text-gradient">ecossistema maior.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            <span className="text-foreground font-semibold">Advocacy<span className="text-primary">.AI</span></span>{" "}
            integra a suíte AI-Native do Legal AI Lab — jurídico, financeiro, patrimonial e geração documental, sob a mesma identidade.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADVOCACY_APPS.map(({ name, url, description, Icon, active }, i) => {
            const baseClasses =
              "glass rounded-xl p-6 relative group transition-colors flex flex-col gap-3 min-h-[160px]";
            const inner = (
              <>
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                      active ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary group-hover:bg-primary/15"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold leading-tight">
                    {name}<span className="text-primary">.AI</span>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
                </div>
              </>
            );

            return (
              <motion.div
                key={name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
              >
                {active ? (
                  <div
                    className={`${baseClasses} border-primary/40 bg-primary/[0.06]`}
                    aria-current="page"
                  >
                    {inner}
                  </div>
                ) : (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${baseClasses} hover:border-primary/40`}
                  >
                    {inner}
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EcosystemSection;