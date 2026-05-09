## Objetivo
Adicionar um menu "Apps" no canto superior direito do Dashboard, exibindo o ecossistema Advocacy.AI com todos os produtos. O produto atual (Study.AI) aparece destacado e marcado como ativo; os demais abrem em nova aba.

## Onde aparece
- Posicionado dentro do header superior do `DashboardLayout` (mesma linha onde hoje fica a quote motivacional), alinhado à direita.
  - Layout: `flex items-center justify-between` — quote à esquerda, botão "Apps" à direita.
- Visível em todas as abas do Dashboard.

## Componentes

### Novo: `src/components/dashboard/AppsLauncher.tsx`
- Botão trigger usando `DropdownMenu` (shadcn) com ícone `LayoutGrid` (lucide) + label "Apps".
- Conteúdo do dropdown (largura ~320px, `rounded-xl`, paleta Study.AI com tokens semânticos):
  - Cabeçalho pequeno: "ECOSSISTEMA" (uppercase, tracking, muted) e "Advocacy.AI" (com ".AI" em cor de destaque `text-primary`).
  - Lista de apps. Cada item:
    - Ícone à esquerda (lucide), nome do produto com sufixo ".AI" colorido em `text-primary`.
    - Subtítulo curto descritivo (muted).
    - Item ativo (Study.AI): borda `border-primary/40`, fundo `bg-primary/10`, com `Check` à direita.
    - Demais itens: link `<a target="_blank" rel="noopener noreferrer">` com ícone `ExternalLink` ao lado do nome.

### Lista de apps (constante no componente)
- Inventaria.AI — `https://inventariaai.lovable.app` — "Planejamento patrimonial e sucessório" — ícone `Scale`
- Peticiona.AI — `https://peticionaai-byadvocacyai.lovable.app` — "Petições, minutas e contratos" — ícone `FileText`
- Advoga.AI — `https://advogaai-byadvocacy.lovable.app` — "Gestão de processos e escritório" — ícone `Briefcase`
- Prospect.AI — `https://prospectai-byadvocacyai.lovable.app` — "Prospecção e inteligência de clientes" — ícone `Search`
- Fin.AI — `https://finai-byadvocacyia.lovable.app` — "Gestão financeira do escritório" — ícone `Wallet`
- Study.AI — `https://studyai-plataforma.lovable.app` — "Pesquisa jurídica e estudos" — ícone `GraduationCap` — **ATIVO**

Observação: a URL de Inventaria.AI fornecida começa com "ttps://"; será corrigida para `https://inventariaai.lovable.app`.

### Integração: `src/components/dashboard/DashboardLayout.tsx`
- Trocar a barra superior de `flex items-center justify-end` para `flex items-center justify-between`.
- Manter a quote à esquerda; renderizar `<AppsLauncher />` à direita.
- No mobile (< sm): mostrar apenas o ícone do botão (label "Apps" oculto via `hidden sm:inline`).

## Estilo
- Tokens semânticos do design system (sem cores hard-coded). Bordas `rounded-xl`, ícones em quadrados arredondados com `bg-muted/40`.
- Item ativo destacado em ciano (`text-primary`, `bg-primary/10`, `border border-primary/30`).

## Fora de escopo
- Sem mudanças em sidebar, RLS, schema, edge functions, autenticação ou outras páginas (landing/auth/onboarding).
- Sem SSO entre apps — cada link apenas abre em nova aba.

## Arquivos impactados
- `src/components/dashboard/AppsLauncher.tsx` (novo)
- `src/components/dashboard/DashboardLayout.tsx` (header recebe o launcher à direita)
