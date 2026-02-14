

## Substituicao do Logotipo em Todos os Locais

### Situacao Atual
O arquivo `public/logo-cognos.png` ja foi substituido pelo novo icone (cerebro geometrico em ciano) na etapa anterior. Todas as 5 ocorrencias no codigo ja apontam para `/logo-cognos.png`, entao o icone novo ja aparece em:

1. **Sidebar** (`src/components/dashboard/Sidebar.tsx`, linha 97)
2. **Pagina de Login** (`src/pages/Auth.tsx`, linha 120)
3. **Pagina de Onboarding** (`src/pages/Onboarding.tsx`, linha 194)
4. **Pagina Inicial - Header** (`src/pages/Index.tsx`, linha 55)
5. **Pagina Inicial - Footer** (`src/pages/Index.tsx`, linha 232)

### O que falta
O **favicon** (icone da aba do navegador) ainda usa o antigo `public/favicon.ico`. Precisa ser atualizado tambem.

### Alteracoes

1. **Copiar o novo logotipo como favicon**
   - Copiar `user-uploads://image-24.png` para `public/favicon.png`

2. **Atualizar `index.html`**
   - Adicionar `<link rel="icon" href="/favicon.png" type="image/png">` no `<head>`

Nenhuma outra alteracao de codigo e necessaria, pois todos os locais ja referenciam `/logo-cognos.png` que ja contem o novo icone.
