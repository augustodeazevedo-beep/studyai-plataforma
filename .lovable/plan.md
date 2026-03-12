

# Plano: Atualizar o Tutorial para refletir todas as funcionalidades da plataforma

## Problema
O Tutorial atual esta desatualizado -- nao menciona funcionalidades recentes como: upload de edital por IA, ferramentas do Professor.IA (flashcards, mapas mentais, simulados, resumos), sistema de revisoes SRS com curva do esquecimento no Coach.IA, o grafico G-Force de 5 vetores na Analise, a aba Bem-Estar (Psique) com anamnese, o Pomodoro editavel e as horas/minutos granulares nas Configuracoes. Tambem nao explica a filosofia por tras dos 5 vetores do COGNOS.

## O que sera feito

### 1. Reescrever a secao "A Estrategia COGNOS"
- Expandir para explicar os **5 vetores** (Relevancia, Incidencia, Compreensao, Intensidade, Psique) e como cada um alimenta o "cerebro" da plataforma.
- Explicar o ciclo completo: Mapeamento -> Execucao -> Coleta -> Otimizacao -> Correcao de Rota.
- Mencionar a curva do esquecimento e a neurociencia do aprendizado como principios fundadores.

### 2. Atualizar a "Visao Geral das Abas" com todas as funcionalidades atuais
Cada aba sera descrita com suas funcionalidades reais:
- **Planner**: Calendario, Registro Rapido, Pomodoro editavel (1-120 min), Heatmap.
- **Arsenal**: Upload de PDF do edital com extracao automatica por IA de disciplinas/topicos/relevancia/incidencia. Gestao manual de materiais.
- **Analise**: Metas, desempenho em questoes, grafico G-Force (Radar de 5 vetores) comparando situacao real vs ideal.
- **Cadernos**: Notas por disciplina com expansao por IA.
- **Previsor.IA**: Previsao de dias ate aprovacao baseada em eficiencia e dedicacao.
- **Coach.IA**: Feedback estrategico + sistema SRS de revisoes espacadas integrado ao Planner e Arsenal.
- **Professor.IA**: Chat + Ferramentas (Flashcards, Mapas Mentais, Simulados, Resumos gerados por IA).
- **Bem-Estar (Psique)**: Anamnese neurocognitiva, check-in diario, dicas personalizadas.
- **Conquistas**: Medalhas desbloqueadas automaticamente.
- **Configuracoes**: Horas/minutos granulares, meta de questoes, periodo de estudo.

### 3. Adicionar nova secao "Os 5 Vetores COGNOS"
Um card dedicado explicando cada vetor em detalhe, sua fonte de dados e como influencia a trajetoria de estudos.

### 4. Adicionar secao "Fluxo Recomendado para Novos Usuarios"
Guia passo-a-passo: Onboarding -> Anamnese (Bem-Estar) -> Upload do Edital (Arsenal) -> Configurar horas (Settings) -> Estudar (Planner) -> Questoes (Analise) -> Revisoes (Coach) -> Previsao (Previsor).

### 5. Atualizar a lista de reset (TOOLS)
Adicionar `psyche_profiles` e `psyche_checkins` na lista de ferramentas resetaveis.

## Arquivo afetado
- `src/components/dashboard/TutorialTab.tsx` -- reescrita completa do conteudo.

