## Objetivo
Adicionar um container de boas-vindas no topo do Dashboard com imagem de fundo identitária (balança da justiça + circuitos em tons cyan/teal sobre fundo escuro), saudação dinâmica conforme horário ("Bom dia / Boa tarde / Boa noite"), nome do usuário em MAIÚSCULAS (com destaque em cyan) e a data atual por extenso em pt-BR.

## Referência visual
- Fundo escuro (graphite/navy) com gradiente sutil, balança da justiça translúcida à direita e linhas de circuito em cyan.
- Chip superior "AI-Native · Study.AI" em cyan/lime.
- Saudação grande em branco + nome em cyan, ambos uppercase.
- Data por extenso, capitalizada (ex.: "Sábado, 09 De Maio De 2026").
- Cantos `rounded-xl`, padding generoso, responsivo (texto reduz no mobile).

## Mudanças

### 1. Novo asset de background
- Gerar `src/assets/dashboard-hero-bg.jpg` (1920x480) inspirado na imagem anexa: balança da justiça estilizada + circuitos, paleta cyan/teal sobre dark navy, sem texto.
- Adaptado à identidade Study.AI (mantém balança como elemento de "justiça/equilíbrio do estudo" + circuitos = IA).

### 2. Novo componente `WelcomeBanner`
- Caminho: `src/components/dashboard/WelcomeBanner.tsx`
- Props: `userName: string`
- Lógica:
  - Saudação por hora local: 5–11 "Bom dia", 12–17 "Boa tarde", 18–4 "Boa noite".
  - Nome em `toUpperCase()`.
  - Data via `Intl.DateTimeFormat('pt-BR', { weekday, day, month, year })` com capitalização title-case.
- Estrutura JSX:
  - `<section>` com `relative overflow-hidden rounded-xl border border-border`
  - `<img>` de fundo `absolute inset-0 w-full h-full object-cover opacity-60`
  - Overlay gradiente `from-background via-background/70 to-transparent` (esquerda → direita).
  - Conteúdo: chip "AI-Native · Study.AI", `<h1>` saudação + nome em cyan (`text-primary`), `<p>` data.
  - Tipografia: `font-display`, `text-2xl sm:text-4xl`, `tracking-tight`, `uppercase`.

### 3. Integração no Dashboard
- `src/components/dashboard/DashboardLayout.tsx`: remover (ou manter discreto) o bloco da quote; mover a quote para dentro do banner como subtítulo opcional, OU manter quote logo abaixo. **Decisão**: manter a quote, mas o WelcomeBanner vira o primeiro elemento dentro do `container`.
- O banner aparece em **todas as abas** (renderizado no layout, não em cada tab), recebendo `userName` já existente via prop.

### 4. Fonte do nome (configurações)
- O `userName` já vem de `user.user_metadata.full_name` em `Dashboard.tsx`. As configurações (`SettingsTab`) atualizam esse mesmo campo via `supabase.auth.updateUser({ data: { full_name } })` — confirmar que o fluxo já existe; se não, garantir leitura também de `profiles.full_name` como fallback.
- Plano: ler de `profiles.full_name` (fonte de verdade das Configurações) com fallback para `user_metadata.full_name` e por fim email. Buscar uma única vez no `Dashboard.tsx` junto do check de onboarding.

## Arquivos impactados
- `src/assets/dashboard-hero-bg.jpg` (novo, gerado via imagegen)
- `src/components/dashboard/WelcomeBanner.tsx` (novo)
- `src/components/dashboard/DashboardLayout.tsx` (renderiza banner)
- `src/pages/Dashboard.tsx` (busca `profiles.full_name` e passa como `userName`)

## Fora de escopo
- Sem alterações em outras páginas (landing, auth, onboarding).
- Sem mudança em sidebar, RLS, edge functions ou schema.
- Sem mexer em e-mails/templates.
