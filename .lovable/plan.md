## Objetivo
Adicionar a marca "by Advocacy.AI" no rodapé da landing page (`src/pages/Index.tsx`), sinalizando que o Study.AI é um produto da Advocacy.AI.

## O que será feito

1. **Adicionar o asset da marca Advocacy.AI**
   - Copiar `user-uploads://Novo_-_Advocacy.AI_Completo_e_Sem_Fundo.png` para `src/assets/advocacy-ai-logo.png`.
   - Usar a versão completa (símbolo + wordmark) em tamanho reduzido para o rodapé.

2. **Atualizar o rodapé da landing (`src/pages/Index.tsx`)**
   - Adicionar uma linha/bloco "by Advocacy.AI" com o logo clicável (link externo `https://advocacy.ai`, `target="_blank"`, `rel="noopener noreferrer"`).
   - Layout: pequena linha centralizada acima ou ao lado do copyright, com texto `by` em `text-muted-foreground` e o logo com altura ~20–24px, mantendo proporção e respeitando o tema escuro forçado da landing.
   - Acessibilidade: `alt="Advocacy.AI"` e `aria-label` no link.

3. **Garantir consistência visual**
   - Como a landing força tema escuro (`document.documentElement.classList.add("dark")`), o PNG transparente atual (com wordmark claro) já funciona — sem necessidade de variante adicional.
   - Não alterar outros logos, sidebar ou demais páginas — escopo limitado ao footer da landing.

## Arquivos afetados
- `src/assets/advocacy-ai-logo.png` (novo)
- `src/pages/Index.tsx` (footer)

## Fora de escopo
- Substituir logos do produto Study.AI.
- Adicionar a marca em outras páginas (dashboard, auth, onboarding).
- Ajustes em e-mails ou meta tags.