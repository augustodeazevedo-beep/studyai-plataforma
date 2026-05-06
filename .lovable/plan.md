## Substituir logotipo Study.AI pelo novo anexo

### O que será feito

Substituir todos os assets de logo em `public/brand/` pelo novo logotipo enviado (cérebro azul-teal + "Study.AI" com ".AI" em verde-lima + tagline "Inteligência pedagógica adaptativa" + "by Advocacy.AI"), mantendo a identidade visual Advocacy.IA já implementada.

### Etapas

1. **Importar imagem original**
   - `code--copy user-uploads://Novo_-_Study.AI_Sem_Fundo.png` → `/tmp/studyai-source.png`

2. **Gerar variantes via Python/PIL** (script descartável em `/tmp`):
   - **Wordmark light** (`public/brand/studyai-wordmark-new-light.webp` + `.png`): logo completo (cérebro + texto + tagline + "by Advocacy.AI") sobre fundo transparente, otimizado para fundos claros. Texto "Study." escurecido para grafite (#1F2A2E) garantindo contraste WCAG AA.
   - **Wordmark dark** (`public/brand/studyai-wordmark-new-dark.webp` + `.png`): mesma composição, mas "Study." em off-white (#F2F3EE) e leve glow neon-lima no ".AI" para tema escuro do dashboard.
   - **Mark/símbolo** (`public/brand/studyai-mark-new.webp` + `.png` + variantes 64/128/256/512): apenas o cérebro com circuitos recortado e centralizado, fundo transparente, usado em sidebar colapsada, favicons internos e botões.
   - **Logo principal** (`public/brand/studyai-logo-new.png`): cópia em alta resolução do original.

3. **SVG fallback** (`public/brand/studyai-mark.svg`): manter — já alinhado à paleta lima/cyan.

4. **Sem mudanças de código**: `BrandLogo` e `src/lib/brand.ts` já apontam para esses caminhos. A substituição dos arquivos atualiza UI automaticamente (landing, auth, sidebar, dashboard, footer).

5. **QA visual**: abrir cada `.webp`/`.png` gerado, verificar transparência, recorte, contraste do texto sobre fundo claro e escuro, e legibilidade da tagline em tamanhos pequenos (sidebar 38px). Iterar se necessário.

### Arquivos impactados

- `public/brand/studyai-logo-new.png`
- `public/brand/studyai-wordmark-new-light.webp` / `.png`
- `public/brand/studyai-wordmark-new-dark.webp` / `.png`
- `public/brand/studyai-mark-new.webp` / `.png` (+ 64/128/256/512)

Sem alterações em código TS/TSX, sem migrações, sem edge functions.
