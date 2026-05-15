## Objetivo
Replicar visualmente o container "Faz parte de um ecossistema maior" (imagem de referência) na landing page do Study.AI e adicionar, na navbar superior, um botão de acesso rápido aos 6 produtos da suíte Advocacy.AI.

## Produtos (ordem fixa)
1. Advocase.AI — CRM, SDR e captação jurídica — `https://advocaseai-byadvocacyai.lovable.app` — ícone `Target`
2. Advoga.AI — Gestão de processos e escritório — `https://advogaai-byadvocacy.lovable.app` — ícone `Briefcase`
3. Peticiona.AI — Petições, minutas e contratos — `https://peticionaai-byadvocacyai.lovable.app` — ícone `FileText`
4. Inventaria.AI — Planejamento patrimonial e sucessório — `https://inventariaai-byadvocacyai.lovable.app` — ícone `Scale`
5. Fin.AI — Inteligência financeira e conciliação — `https://finai-byadvocacyia.lovable.app` — ícone `Wallet`
6. Study.AI — Plataforma de estudos jurídicos — `https://studyai-byadvocacyai.lovable.app` — ícone `GraduationCap` — marcado como `active` (página atual)

## Alterações

### 1. Novo componente `src/components/landing/EcosystemSection.tsx`
Seção full-width acima do `PricingSection`, com:
- Eyebrow em uppercase tracking-widest cyan: `ECOSSISTEMA ADVOCACY.AI`
- Título: `Faz parte de um` + `ecossistema maior.` (font-display, gradiente em "ecossistema maior" via `text-gradient`)
- Subtítulo em `text-muted-foreground`: descrição da suíte AI-Native, mencionando Advocacy.AI integrando jurídico, financeiro, patrimonial e geração documental
- Grid `md:grid-cols-2 lg:grid-cols-3 gap-4` com 6 cards
- Cada card: classe `glass rounded-xl p-6` + hover `border-primary/30`, ícone Lucide em caixa `bg-primary/10 rounded-lg`, nome com `.AI` em `text-primary` (padrão Study.AI), descrição em `text-sm text-muted-foreground`, ícone `ExternalLink` no canto superior direito
- Card ativo (Study.AI): `border-primary/40 bg-primary/10`, sem link (renderiza `<div aria-current="page">`)
- Demais cards: `<a target="_blank" rel="noopener noreferrer">`
- Animação `motion` com `fadeUp` reaproveitando o padrão da página

### 2. Botão "Apps" na navbar — `src/pages/Index.tsx`
- Adicionar antes do botão "Entrar" um `DropdownMenu` (shadcn) inspirado em `src/components/dashboard/AppsLauncher.tsx`, com:
  - Trigger: `Button variant="outline" size="sm"` com ícone `LayoutGrid` + label "Apps" (oculto em mobile, `hidden sm:inline`)
  - Conteúdo: header "Ecossistema Advocacy.AI", lista dos 6 produtos com ícone, nome, descrição curta, `ExternalLink`/`Check` (Study.AI marcado como atual)
- Manter o mesmo dataset usado pela seção (extrair para um único array em `EcosystemSection.tsx` e exportar, ou criar `src/data/advocacyApps.ts` compartilhado entre `EcosystemSection` e o dropdown da navbar para evitar duplicação)

### 3. Inserção na landing — `src/pages/Index.tsx`
- Importar `EcosystemSection` e renderizar entre o CTA motivacional e o `PricingSection`
- Importar e montar o `DropdownMenu` no header (linha ~127)

## Decisões de design (alinhadas à identidade Study.AI)
- Reutilizar tokens semânticos: `bg-background`, `glass`, `border-primary/*`, `text-primary`, `text-gradient`, `rounded-xl`
- Sem cores hardcoded; sem alterar `index.css` ou `tailwind.config.ts`
- Mobile-first: 1 coluna no mobile, 2 no md, 3 no lg

## Fora de escopo
- Sem mudanças em backend, rotas ou conteúdo do dashboard
- Sem mudanças no `AppsLauncher` do dashboard (já existente)
- Sem novas imagens/ativos

## Arquivos impactados
- `src/data/advocacyApps.ts` (novo — fonte única dos 6 produtos)
- `src/components/landing/EcosystemSection.tsx` (novo)
- `src/pages/Index.tsx` (import da seção + dropdown na navbar)
