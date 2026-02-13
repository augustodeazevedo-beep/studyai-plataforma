

# Fase 3: Reestruturar Dashboard para Espelhar Plataforma Modelo

Analise comparativa entre a plataforma modelo (screenshots) e a implementacao atual revelou gaps significativos. Este plano reorganiza a navegacao e adiciona 5 novas abas com funcionalidades de IA.

---

## Mapeamento: Modelo vs. Atual

| Aba Modelo | Status Atual | Acao |
|---|---|---|
| Planner | Parcial (timer existe separado) | Recriar com calendario, blocos de estudo, heatmap de intensidade, timer Pomodoro integrado, registro rapido de sessoes, historico recente |
| Arsenal | Parcial (materials + notes separados) | Nova aba: processamento de edital com IA, gestao de disciplinas com topicos e checkboxes, relevancia/incidencia/conhecimento por disciplina |
| Analise | Parcial (progress existe) | Recriar como "Analise de Batalha" com stats cards, progresso por topicos, registro rapido de questoes, programador de revisoes, grafico de acuracia, radar 5 eixos, metas semanais, lembretes |
| Cadernos | Parcial (notes existe) | Recriar como "Cadernos Inteligentes" com grid de disciplinas, nota rapida vinculada, "Expandir com IA", notas recentes |
| Historico | Nao existe | Nova aba: tabela completa de sessoes com data, disciplina, material, paginas, duracao, compreensao (estrelas) |
| Previsor.IA | Nao existe | Nova aba: gerador de ciclos com IA (prever data de conclusao ou calcular ritmo diario), selecao de disciplinas |
| Coach.IA | Nao existe | Nova aba: conselho estrategico via IA com historico de conselhos |
| Professor.IA | Nao existe | Nova aba: chat com IA professor especialista no edital |
| Conquistas | Nao existe | Nova aba: mural de badges gamificados + avanco diario (ring chart) |
| Configuracoes | Existe | Manter |

---

## Reestruturacao do Sidebar

Nova ordem de navegacao (espelhando o modelo):

1. **Planner** (icone: CalendarDays) - Calendario + Timer + Sessoes
2. **Arsenal** (icone: Shield) - Edital + Disciplinas + Topicos
3. **Analise** (icone: BarChart3) - Dashboard analitico completo
4. **Cadernos** (icone: BookOpen) - Anotacoes inteligentes
5. **Historico** (icone: History) - Tabela de sessoes
6. **Previsor.IA** (icone: Sparkles) - Gerador de ciclos
7. **Coach.IA** (icone: Brain) - Conselho estrategico
8. **Professor.IA** (icone: MessageCircle) - Chat com professor IA
9. **Conquistas** (icone: Trophy) - Gamificacao
10. **Configuracoes** (icone: Settings) - Perfil e preferencias

Adicionar frase motivacional fixa no topo direito de cada aba (como no modelo: "Persistencia transforma sonho em realidade").

---

## Detalhes por Aba

### 1. Planner (nova - substitui overview + timer)

Layout baseado no screenshot: area principal com calendario mensal + coluna direita com timer e registro rapido.

- **Heatmap de Intensidade**: barra horizontal no topo mostrando intensidade de estudo por dia (estilo GitHub contributions)
- **Calendario mensal**: grid com dias, botao "+ Bloco" em cada dia para adicionar sessao de estudo
- **Foco Pomodoro** (coluna direita): timer grande com play/reset, mostrando 25:00
- **Registro de Sessoes Rapido** (coluna direita): formulario com disciplina, material, pagina inicio/fim, duracao, compreensao (5 estrelas), botao "Adicionar Sessao"
- **Historico Recente de Sessoes** (abaixo): tabela com ultimas 10 sessoes

### 2. Arsenal (nova - substitui materials)

- **Stats cards** no topo: disciplinas ativas, topicos no edital, topicos dominados, conclusao geral %
- **Processar Novo Edital**: textarea para colar conteudo do edital, botao "Processar Edital Manual" que usa IA para extrair disciplinas e topicos
- **Adicionar Nova Disciplina**: formulario inline com nome, relevancia (1-5), incidencia (1-5), conhecimento (1-5), botao "+ Adicionar"
- **Grid de Disciplinas**: cards com nome da disciplina colorido, metricas (Relevancia, Incidencia, Conhecimento), lista de topicos com checkboxes, botao editar, campo "Novo topico" + "Adicionar"

### 3. Analise (recriar progress)

Layout 3 colunas: principal + sidebar direita.

- **Stats cards**: Horas Totais, Taxa de Conclusao %, Eficiencia Media %, Topicos Dominados
- **Progresso por Disciplina (Topicos)**: barras horizontais por disciplina mostrando topicos concluidos/total
- **Registro Rapido de Questoes** (sidebar): selecionar disciplina, questoes tentadas, questoes corretas, botao "Registrar"
- **Programador de Revisoes** (sidebar): selecionar disciplina, periodo (7 dias), topico, botao "Agendar"
- **Metas de Estudo Semanal**: barras de progresso para horas de estudo e questoes resolvidas
- **Desempenho em Questoes**: grafico de barras de acuracia por disciplina
- **Analise de Eixos**: grafico radar com 5 eixos (Relevancia, Incidencia, Acuracia, Desempenho, Lacuna) por disciplina
- **Lembretes** (sidebar): campo para adicionar lembretes com data

### 4. Cadernos (recriar notes)

- **Nova Nota Rapida** (coluna esquerda): vincular a disciplina (select), textarea para anotacao/flashcard, seletor de cor, botao "Salvar Nota", botao "Expandir com IA" (usa IA para expandir a anotacao)
- **Grid de Disciplinas** (colunas direitas): cards com nome da disciplina e contagem de notas, clicavel para ver notas daquela disciplina
- **Notas Recentes**: lista das ultimas notas criadas

### 5. Historico (nova)

- Tabela completa e paginada de todas as sessoes de estudo
- Colunas: Data, Disciplina, Material, Paginas/Video, Duracao, Compreensao (estrelas)
- Filtros por disciplina e periodo
- Botao "Adicionar Sessao" no topo

### 6. Previsor.IA (nova)

- **Gerador de Ciclos**: duas abas - "Prever Data de Conclusao" e "Calcular Ritmo Diario"
- Inputs: Tempo Diario (minutos), Data de Inicio
- **Disciplinas a Incluir**: grid de checkboxes com todas as disciplinas, "Selecionar Todas"
- Botao "Gerar Previsao do Ciclo" que chama edge function com IA
- Resultado: cronograma gerado com datas previstas

### 7. Coach.IA (nova)

- **Conselho Estrategico** (coluna principal): area de texto mostrando o conselho gerado, botao "Gerar Conselho" que analisa dados do usuario e gera feedback personalizado via IA
- **Historico de Conselhos** (coluna direita): lista dos ultimos conselhos gerados com timestamps

### 8. Professor.IA (nova)

- Interface de chat: mensagens em bolhas (IA e usuario)
- Mensagem inicial da IA com saudacao
- Campo de input "Pergunte ao Professor..." com botao enviar
- Contexto do edital e disciplinas do usuario enviado junto com cada pergunta
- Historico de conversa mantido na sessao

### 9. Conquistas (nova)

- **Mural de Badges**: grid de conquistas com icones, nome, status (desbloqueado/bloqueado)
- Badges: Iniciante, Leitor Voraz, Entendimento Pleno, Mestre da Materia, Esforcado, Anotador, Polimata, Conquistador, Maratonista, Questionador, Precisao, Revisor
- **Avanco Diario (Hoje)**: ring chart mostrando horas estudadas hoje vs meta diaria

---

## Novas Tabelas no Banco de Dados

1. **topics** - Topicos por disciplina
   - `id`, `user_id`, `subject_id` (FK), `name`, `completed` (boolean), `order_index`, `created_at`

2. **ai_coaching_history** - Historico de conselhos do Coach.IA
   - `id`, `user_id`, `content` (text), `created_at`

3. **user_achievements** - Conquistas desbloqueadas
   - `id`, `user_id`, `achievement_key` (text), `unlocked_at`

4. **reminders** - Lembretes do usuario
   - `id`, `user_id`, `text`, `reminder_date`, `completed`, `created_at`

Todas com RLS habilitado.

### Alteracoes em tabelas existentes

- **study_sessions**: adicionar colunas `material_name` (text), `pages_start` (int), `pages_end` (int), `comprehension_rating` (int 1-5)

---

## Novas Edge Functions

1. **process-edital** - Recebe texto do edital, usa IA para extrair disciplinas e topicos estruturados
2. **ai-coach** - Analisa dados do usuario e gera conselho estrategico personalizado
3. **ai-professor** - Chat contextualizado com dados do edital e disciplinas do usuario
4. **predict-cycle** - Calcula previsao de conclusao ou ritmo diario necessario
5. **expand-note** - Recebe anotacao e usa IA para expandir/enriquecer o conteudo

---

## Arquivos a Criar/Modificar

### Novos componentes (9 arquivos):
- `src/components/dashboard/PlannerTab.tsx`
- `src/components/dashboard/ArsenalTab.tsx`
- `src/components/dashboard/AnalysisTab.tsx`
- `src/components/dashboard/NotebooksTab.tsx`
- `src/components/dashboard/HistoryTab.tsx`
- `src/components/dashboard/PredictorTab.tsx`
- `src/components/dashboard/CoachTab.tsx`
- `src/components/dashboard/ProfessorTab.tsx`
- `src/components/dashboard/AchievementsTab.tsx`

### Modificar (3 arquivos):
- `src/components/dashboard/Sidebar.tsx` - Nova navegacao com 10 abas
- `src/pages/Dashboard.tsx` - Novo switch/case com todas as abas
- `src/components/dashboard/DashboardLayout.tsx` - Adicionar frase motivacional no topo

### Remover (abas antigas que serao substituidas):
- `OverviewTab.tsx` (incorporado no Planner)
- `StudyPlanTab.tsx` (incorporado no Arsenal/Analise)
- `ReviewsTab.tsx` (incorporado na Analise)
- `QuestionsTab.tsx` (mantido como sub-funcionalidade)
- `FlashcardsTab.tsx` (incorporado nos Cadernos)
- `MaterialsTab.tsx` (incorporado no Arsenal)
- `NotesTab.tsx` (substituido por NotebooksTab)
- `ProgressTab.tsx` (substituido por AnalysisTab)
- `StudyTimerTab.tsx` (incorporado no Planner)

### Novas Edge Functions (5 arquivos):
- `supabase/functions/process-edital/index.ts`
- `supabase/functions/ai-coach/index.ts`
- `supabase/functions/ai-professor/index.ts`
- `supabase/functions/predict-cycle/index.ts`
- `supabase/functions/expand-note/index.ts`

---

## Sequencia de Implementacao

1. Migracoes de banco (novas tabelas + alteracoes)
2. Edge functions (5 novas funcoes de IA)
3. Sidebar e DashboardLayout atualizados
4. Componentes das abas (Planner, Arsenal, Analise, Cadernos, Historico, Previsor, Coach, Professor, Conquistas)
5. Dashboard.tsx com novo roteamento
6. Limpeza dos componentes antigos

