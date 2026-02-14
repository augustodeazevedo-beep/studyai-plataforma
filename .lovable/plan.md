

## Ajuste do logotipo e nome na sidebar

### O que sera feito
Ajustar o cabecalho da sidebar para que o logotipo (cerebro) e o nome (COGNOS / Study.AI) fiquem **exatamente** como na imagem de referencia:

- Icone do cerebro (logo-cognos.png) em tamanho adequado (~32px), com tonalidade azul/ciano
- "COGNOS" em texto branco, bold, tamanho maior (~16-18px), com tracking (espacamento entre letras) largo
- "Study.AI" logo abaixo, em ciano (#0dd3f0 / cor sidebar-primary), tamanho menor (~11px), semi-bold

### Alteracoes tecnicas

**Arquivo:** `src/components/dashboard/Sidebar.tsx` (linhas 96-103)

Ajustes no bloco do cabecalho:

1. Aumentar levemente o icone do logo para `h-9 w-9` para melhor proporcao
2. Ajustar "COGNOS" para `text-lg font-bold tracking-widest text-white` (branco puro, nao sidebar-foreground que pode variar)
3. Ajustar "Study.AI" para `text-[11px] font-semibold text-cyan-400` (ciano vibrante, garantindo correspondencia visual)
4. Reduzir `leading-none` e `gap-2` entre icone e texto para compactar o layout como na referencia
5. Garantir alinhamento vertical centralizado entre icone e bloco de texto

Nenhum outro arquivo precisa ser alterado. A mudanca e puramente visual no cabecalho da sidebar.
