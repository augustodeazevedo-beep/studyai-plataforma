## Objetivo
Reduzir levemente o container de boas-vindas (`WelcomeBanner`) e trocar a imagem de fundo (atualmente "balança da justiça") por uma com identidade de **neurociência + IA**, mantendo a paleta Study.AI (ciano/teal sobre fundo escuro).

## Alterações

### 1. Nova imagem de fundo — `src/assets/dashboard-hero-bg.jpg` (substituir)
Gerar via `imagegen--generate_image` (modelo `standard`, 1920x640, sem transparência) com prompt focado em:
- Cérebro humano estilizado em wireframe/holográfico ciano-teal
- Circuitos neurais, sinapses brilhantes, nós de rede neural
- Partículas de dados, linhas de circuito sutis ao fundo
- Fundo escuro (azul-marinho/preto) compatível com `bg-background`
- Estética futurista, AI-native, tom científico (não cartoon)
- Lado esquerdo mais escuro/limpo para o gradiente do texto respirar

### 2. Reduzir o container — `src/components/dashboard/WelcomeBanner.tsx`
Apenas ajustes de espaçamento/tamanho (sem mexer em estrutura, gradiente ou cores):
- Padding: `px-5 py-5 sm:px-8 sm:py-6` → `px-4 py-4 sm:px-7 sm:py-5`
- Greeting `h1`: `text-xl sm:text-3xl` → `text-lg sm:text-2xl`
- Chip "AI-Native · Study.AI": `mb-3` → `mb-2`
- Data: `mt-2 text-sm sm:text-base` → `mt-1.5 text-xs sm:text-sm`

Mantém: imagem importada, `opacity-70`, gradiente, nome em uppercase com `text-primary`, borda `rounded-xl`.

## Fora de escopo
- Sem mudanças em layout do header, AppsLauncher, sidebar, dados ou backend.

## Arquivos impactados
- `src/assets/dashboard-hero-bg.jpg` (regenerada)
- `src/components/dashboard/WelcomeBanner.tsx` (ajuste fino de tamanho)
