

## Plano de Ajustes Visuais

### 1. Arredondar bordas do icone do cerebro
O icone atual (`icon-dark.png` e `icon-light.png`) possui cantos mais quadrados. O usuario quer bordas arredondadas (como na segunda imagem de referencia). Como os arquivos de imagem ja estao definidos, a solucao e aplicar `rounded-xl` (ou `rounded-2xl`) via CSS em todas as tags `<img>` que referenciam esses icones, em vez de editar os PNGs.

**Arquivos afetados:**
- `src/components/dashboard/Sidebar.tsx` (linha 100) -- adicionar `rounded-xl`
- `src/pages/Index.tsx` (linhas 66 e 252) -- adicionar `rounded-xl`
- `src/pages/Auth.tsx` (linha 120) -- usa `logo-cognos.png`, tambem adicionar `rounded-xl`
- `src/pages/Onboarding.tsx` (linha 194) -- usa `logo-cognos.png`, tambem adicionar `rounded-xl`

### 2. Remover linha divisoria entre a barra superior e o conteudo do Planner
Na `DashboardLayout.tsx` (linha 28), a barra de citacoes tem `border-b border-border` que cria a linha clara visivel. Essa classe sera removida.

### 3. Auditoria de responsividade mobile
Apos as alteracoes visuais, farei uma verificacao completa navegando pelo site em viewport 390x844 (iPhone 14), cobrindo:
- Landing page (navbar, hero, features, depoimentos, precos, FAQ, footer)
- Pagina de autenticacao
- Dashboard (sidebar mobile, abas)

---

### Detalhes Tecnicos

**Sidebar.tsx** -- linha 100:
- De: `className={cn("h-9 w-9 object-contain", isDark && "bg-transparent")}`
- Para: `className={cn("h-9 w-9 object-contain rounded-xl", isDark && "bg-transparent")}`

**Index.tsx** -- linha 66:
- De: `className="h-8 w-8 object-contain"`
- Para: `className="h-8 w-8 object-contain rounded-xl"`

**Index.tsx** -- linha 252:
- De: `className="h-6"`
- Para: `className="h-6 rounded-xl"`

**Auth.tsx** -- linha 120:
- De: `className="h-10"`
- Para: `className="h-10 rounded-xl"`

**Onboarding.tsx** -- linha 194:
- De: `className="h-8"`
- Para: `className="h-8 rounded-xl"`

**DashboardLayout.tsx** -- linha 28:
- De: `className="flex items-center justify-end gap-2 px-6 py-3 border-b border-border"`
- Para: `className="flex items-center justify-end gap-2 px-6 py-3"`

**Auditoria mobile:** Navegacao em 390px para verificar todos os elementos apos as mudancas.

