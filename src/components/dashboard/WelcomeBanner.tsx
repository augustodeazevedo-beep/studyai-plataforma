import heroBg from "@/assets/dashboard-hero-bg.jpg";

interface WelcomeBannerProps {
  userName: string;
}

const getGreeting = (h: number) => {
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
};

const titleCase = (s: string) =>
  s.replace(/\b\p{L}+/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

const WelcomeBanner = ({ userName }: WelcomeBannerProps) => {
  const now = new Date();
  const greeting = getGreeting(now.getHours());
  const dateStr = titleCase(
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(now)
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-border mb-4">
      <img
        src={heroBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover opacity-70"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10" />
      <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/40 bg-primary/10 text-xs font-semibold text-primary mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          AI-Native · Study.AI
        </div>
        <h1 className="font-display font-bold uppercase tracking-tight text-xl sm:text-3xl text-foreground leading-tight">
          {greeting},{" "}
          <span className="text-primary">{userName.toUpperCase()}</span>
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">{dateStr}</p>
      </div>
    </section>
  );
};

export default WelcomeBanner;
