## Objetivo
Rebranding completo do Study.AI substituindo todos os logotipos em uso pela nova identidade visual enviada (cérebro azul cromado + wordmark "Study.AI" com ponto verde-lima + tagline "Inteligência pedagógica adaptativa" + assinatura "by Advocacy.AI"), com tratamento profissional de marketing digital (variantes otimizadas, contraste correto em dark/light, múltiplos tamanhos, favicon e OG image).

## O que será feito

### 1. Geração das variantes do novo logo (a partir do upload)
A partir de `user-uploads://Novo_-_Study.AI_Sem_Fundo-3.png` serão derivadas, em `public/brand/`, as seguintes peças (PNG + WebP, fundo transparente):

- **Símbolo (mark — só o cérebro)**: `studyai-mark-v3.{webp,png}` + tamanhos `64, 128, 256, 512`. Usado em sidebar colapsada, favicon, app icon, botões.
- **Wordmark horizontal escuro (para fundos escuros)**: `studyai-wordmark-v3-dark.{webp,png}` — cérebro + "Study.AI" claro.
- **Wordmark horizontal claro (para fundos claros)**: `studyai-wordmark-v3-light.{webp,png}` — mesmo layout, mas com a palavra "Study.AI" em tom escuro/grafite para contraste em tema claro (ajuste de cor via edição da imagem, mantendo o cérebro e o ponto verde-lima).
- **Lockup completo com tagline + "by Advocacy.AI"**: `studyai-lockup-v3-dark.{webp,png}` e `…-light.{webp,png}` — usado no rodapé da landing, telas de auth e onboarding.
- **Favicon**: `favicon.ico` (32/16) e `apple-touch-icon.png` (180) gerados a partir do mark.
- **OG / social share**: `public/og-studyai.jpg` (1200×630) com o lockup centralizado sobre fundo grafite da marca.

Otimizações: WebP com qualidade ~86, PNGs com transparência preservada, tamanhos múltiplos para evitar reescala no navegador (boas práticas de performance e nitidez em retina).

### 2. Atualização do "single source of truth" da marca (`src/lib/brand.ts`)
- Trocar `defaultBrandSettings.wordmarkSrc`, `wordmarkLightSrc` e `markSrc` para os novos arquivos `…-v3.webp`.
- Estender `LEGACY_WORDMARKS` / `LEGACY_MARKS` para invalidar os caminhos `…-new-…` salvos em `localStorage` de usuários que já abriram a plataforma — assim o Brand Kit volta a apontar para os novos defaults sem ação manual.
- Atualizar `tagline` para "Inteligência pedagógica adaptativa" (já é o valor atual, manter).

### 3. Atualização do índice e meta tags (`index.html`)
- Trocar `<link rel="icon">`, `<link rel="apple-touch-icon">`, `<meta property="og:image">` e `<meta name="twitter:image">` para os novos arquivos.
- Atualizar `<meta name="theme-color">` se necessário para harmonizar com o azul cromado do cérebro (`#16d3ee` aprox.).

### 4. Footer da landing — assinatura "by Advocacy.AI"
Como o novo lockup já traz "by Advocacy.AI" embutido, simplificar `src/pages/Index.tsx`:
- Remover o bloco extra com o logo separado da Advocacy.AI (`src/assets/advocacy-ai-logo.png`) para evitar redundância.
- Manter o link clicável para `https://advocacy.ai` envolvendo o lockup completo no rodapé.
- Alternativa (se preferir manter o logo Advocacy.AI separado): remover apenas a tagline "by Advocacy.AI" do lockup — a decisão será tomada visualmente durante o QA.

### 5. Locais que consomem logo (revisão de cobertura)
Componentes que já usam `BrandLogo` herdam automaticamente da troca em `brand.ts` — não precisam de edição:
- `src/components/dashboard/Sidebar.tsx` (sidebar dashboard, expandida e colapsada)
- `src/pages/Auth.tsx`, `src/pages/Onboarding.tsx`, `src/pages/ResetPassword.tsx`
- `src/pages/Index.tsx` (header e footer da landing)
- `src/components/dashboard/BrandKitTab.tsx` (preview)

Ainda assim, será feita uma varredura por `rg "studyai-(wordmark|mark)"` e `rg "advocacy-ai-logo"` para apanhar referências hard-coded fora do `BrandLogo` (ex.: emails, edge functions, OG image antigo) e migrar todas.

### 6. E-mails transacionais
Conferir os templates em `supabase/functions/_shared/email-templates/*.tsx`. Se algum referenciar o logo via URL pública (`/brand/...` no domínio publicado), atualizar para o novo arquivo. Sem mudança de lógica — apenas a URL do `<img>`.

### 7. QA visual
- Build local + inspeção de:
  - Sidebar dashboard (expandida e colapsada) — tema escuro e claro.
  - Landing page (header, hero, footer) em 390px e 1280px.
  - Páginas Auth / Onboarding / ResetPassword.
  - Favicon na aba do navegador.
  - OG image via `https://www.opengraph.xyz/` (após publish — opcional).
- Verificar contraste do wordmark claro sobre fundos claros e do escuro sobre fundos escuros.

## Arquivos afetados
- `public/brand/studyai-mark-v3.{webp,png}` + tamanhos (novos)
- `public/brand/studyai-wordmark-v3-{dark,light}.{webp,png}` (novos)
- `public/brand/studyai-lockup-v3-{dark,light}.{webp,png}` (novos)
- `public/favicon.ico`, `public/apple-touch-icon.png`, `public/og-studyai.jpg` (novos/substituídos)
- `src/lib/brand.ts` (defaults + legacy invalidation)
- `index.html` (favicon, OG, theme-color)
- `src/pages/Index.tsx` (footer — simplificação da assinatura Advocacy.AI)
- Possíveis ajustes em `supabase/functions/_shared/email-templates/*.tsx` se houver referência direta ao logo

## Fora de escopo
- Mudança de paleta de cores do design system (cyan/lime continuam).
- Refatoração de componentes que já usam `BrandLogo`.
- Geração de novo manual de marca / brandbook em PDF.
- Animações de logo (lottie / motion).

## Detalhes técnicos
- Geração das variantes via `imagegen--edit_image` (recortar só o cérebro para o mark; ajustar cor do wordmark para a versão light; criar OG 1200×630 com fundo grafite `hsl(217 17% 12%)`).
- Favicon: usar `nix run nixpkgs#imagemagick` para converter o mark 256 em `.ico` multi-resolução.
- WebP: `nix run nixpkgs#libwebp -- cwebp -q 86`.
- Sem migrações de banco, sem mudanças em edge functions além de URLs estáticas.
