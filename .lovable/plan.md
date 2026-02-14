

## Substituicao do Logotipo

### O que sera feito
Substituir o arquivo de logotipo atual (`public/logo-cognos.png`) pelo novo logotipo da imagem enviada (image-22.png). O novo icone (geometrico/abstrato em ciano) sera usado no cabecalho da sidebar, mantendo as cores e fundo da plataforma atual.

### Alteracoes

1. **Copiar o novo logotipo** de `user-uploads://image-22.png` para `public/logo-cognos.png`, substituindo o arquivo existente.

2. **Ajustar o componente Sidebar** (`src/components/dashboard/Sidebar.tsx`):
   - Manter a tag `<img>` apontando para `/logo-cognos.png`
   - Ajustar dimensoes se necessario para que o novo icone fique proporcional (~32-36px)
   - Manter o layout existente com "COGNOS" em branco e "Study.AI" em ciano

Nenhuma outra alteracao necessaria -- o fundo e cores da sidebar permanecem inalterados.

