# Rebranding Study.AI → identidade visual Advocacy.IA

## Referência de identidade (advocacyia.lovable.app)

- **Verde-lima neon** (`#C6F23E` aprox.) como cor primária / destaque (texto-gradiente, botões CTA, glow, badges).
- **Grafite/teal escuro** (`#1F2A2E` / `#0E1518`) para textos fortes e superfícies escuras.
- **Cinza-claro off-white** (`#F2F3EE`) como background da landing (modo claro, levemente esverdeado).
- **Cyan/teal** (`#16D3EE`) como acento secundário (já presente no Study.AI — manter como cor de apoio).
- Tipografia display sem serifa pesada (estilo Space Grotesk — já temos), CTAs com cantos arredondados sutis e contraste forte preto/lima.
- Hero com imagem de fundo "circuit board" desfocada + glow neon nas bordas.

## Mudanças

### 1. Tokens de cor (`src/index.css`)
Reescrever `:root` (tema claro padrão da landing) e `.dark` (dashboard) para refletir a paleta:

```text
Light (landing default):
  --background: 70 12% 95%       (off-white esverdeado)
  --foreground: 200 20% 12%      (grafite)
  --primary:    74 86% 60%       (verde-lima neon #C6F23E)
  --primary-foreground: 200 25% 10%
  --accent:     188 85% 51%      (cyan apoio)
  --ring/info:  74 86% 60%

Dark (dashboard / hero):
  --background: 200 25% 7%
  --foreground: 70 30% 94%
  --primary:    74 86% 62%
  --primary-foreground: 200 25% 8%
  --accent:     188 85% 55%

Gradients:
  --gradient-primary: linear-gradient(135deg, hsl(74 86% 60%), hsl(188 85% 51%))
  --gradient-accent:  linear-gradient(135deg, hsl(74 86% 60%), hsl(200 25% 12%))
  --shadow-glow:        0 0 20px hsl(74 86% 60% / 0.30)
  --shadow-glow-strong: 0 0 48px hsl(74 86% 60% / 0.45)
```

### 2. Logotipo Study.AI recolorido
Recriar via Python/PIL os assets em `public/brand/` mantendo a estrutura atual (mesmos nomes — `BrandLogo` continua funcionando sem alteração de código):

- `studyai-wordmark-new-light.webp` — símbolo + "Study." em grafite (#1F2A2E), ".AI" em verde-lima (#C6F23E), tagline cyan.
- `studyai-wordmark-new-dark.webp` — "Study." em off-white, ".AI" em verde-lima com glow neon, tagline cyan.
- `studyai-mark-new.webp` (+ 64/128/256/512) — símbolo recolorido para verde-lima com leve halo cyan.
- `studyai-mark.svg` (fallback) — trocar `stroke="#16d3ee"` por `#C6F23E` mantendo detalhes internos cyan claro.

Slogan permanece "Inteligência pedagógica adaptativa".

### 3. Landing page (modo claro forçado por padrão na home)
- `src/pages/Index.tsx`: garantir background off-white com textura sutil de circuito (gradient + radial glow lima/cyan no hero) — adicionar wrapper com classe utilitária `bg-[hsl(var(--background))]` + camada `bg-[radial-gradient(...)]`.
- `src/components/landing/PricingSection.tsx`: card "Premium" passa a usar `bg-primary/15`, badge "Mais Popular" preto sobre verde-lima.
- `TestimonialsSection.tsx`, `FAQSection.tsx`, `LeadCaptureForm.tsx`: ajustes pontuais de contraste (estrelas, ícones, bordas) para combinar com nova paleta — sem mudança estrutural, só revisão de classes `text-primary`/`bg-primary` (que já herdam do token).
- Hero CTA principal: botão preto-grafite com texto verde-lima (estilo Advocacy.IA "Agendar Diagnóstico").

### 4. Dashboard (tema escuro)
- Mantém arquitetura, apenas herda novos tokens (verde-lima vira accent principal). Revisar `src/components/dashboard/Sidebar.tsx` e `DashboardLayout.tsx` apenas para garantir que itens ativos usem `text-primary` (já é o caso).

### 5. Memória
Atualizar `mem://brand/identity` e Core do `mem://index.md`:
- "Acentos cyan/teal" → "Verde-lima neon (#C6F23E) primário + cyan/teal apoio + grafite escuro. Inspirado em Advocacy.IA."

## Arquivos impactados

- `src/index.css` (tokens)
- `public/brand/*` (regerados via script Python descartável em `/tmp`)
- `public/brand/studyai-mark.svg`
- `src/pages/Index.tsx` (background hero)
- `src/components/landing/PricingSection.tsx` (highlight)
- `mem://index.md`, `mem://brand/identity`

Sem migrações, sem mudanças de schema, sem edge functions tocadas.

## QA
- `bun run build` (automático).
- Inspeção visual via screenshot do preview em `/` e `/dashboard` para validar contraste WCAG AA do verde-lima sobre fundo claro/escuro.
