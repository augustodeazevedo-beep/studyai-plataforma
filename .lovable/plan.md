## Objetivo
Reduzir levemente a altura/padding do `WelcomeBanner` no Dashboard para ficar mais compacto, espelhando a referência anexa (faixa mais fina, com saudação grande e data logo abaixo, sem ar excessivo).

## Mudanças

### `src/components/dashboard/WelcomeBanner.tsx`
- Reduzir o padding vertical do bloco de conteúdo:
  - de `px-6 py-8 sm:px-10 sm:py-10` → `px-5 py-5 sm:px-8 sm:py-6`
- Reduzir levemente o tamanho da tipografia da saudação:
  - de `text-2xl sm:text-4xl` → `text-xl sm:text-3xl`
- Reduzir o espaçamento entre o chip e o título:
  - chip `mb-4` → `mb-3`
- Reduzir margem inferior do banner:
  - `mb-6` → `mb-4`
- Manter chip "AI-Native · Study.AI", imagem de fundo, gradiente, nome em uppercase com cor `text-primary` e a data por extenso — apenas a escala muda.

## Fora de escopo
- Sem alterar a imagem de fundo, cores, fontes, o componente em outros lugares ou qualquer lógica (saudação, data, fonte do nome).
- Sem mudanças em outras páginas, sidebar, RLS, schema ou edge functions.
