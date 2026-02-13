

# COGNOS Study.AI — Fase 2: Motor de IA, Google OAuth, Banco de Dados e Dashboard Completo

Este plano cobre 4 grandes frentes de desenvolvimento para transformar a plataforma em um sistema funcional completo.

---

## Fase 2A: Google OAuth

Configurar login social com Google usando o sistema gerenciado do Lovable Cloud.

- Usar a ferramenta de configuracao social auth do Cloud para gerar o modulo `lovable.auth`
- Atualizar `Auth.tsx` para usar `lovable.auth.signInWithOAuth("google", ...)` no lugar de `supabase.auth.signInWithOAuth`
- Manter o login por email/senha via Supabase Auth

---

## Fase 2B: Novas Tabelas no Banco de Dados

Criar a estrutura de dados para sessoes de estudo, revisoes espaçadas e progresso.

### Tabelas a criar:

1. **study_sessions** — Registro de cada sessao de estudo
   - `id`, `user_id`, `subject_id` (FK -> user_subjects), `started_at`, `ended_at`, `duration_minutes`, `notes`, `created_at`

2. **study_plan** — Plano gerado pela IA para cada usuario
   - `id`, `user_id`, `subject_id` (FK -> user_subjects), `priority_score`, `relevance`, `incidence`, `accuracy`, `performance`, `gap_score`, `recommended_hours_weekly`, `updated_at`, `created_at`

3. **spaced_reviews** — Revisoes espaçadas (SRS)
   - `id`, `user_id`, `subject_id` (FK -> user_subjects), `review_date`, `interval_days` (1,3,7,15,30), `completed`, `performance_rating` (1-5), `next_review_date`, `created_at`

4. **questions** — Banco de questoes
   - `id`, `user_id`, `subject_id`, `question_text`, `options` (JSONB), `correct_option`, `explanation`, `difficulty` (1-5), `source`, `created_at`

5. **question_attempts** — Tentativas de resposta
   - `id`, `user_id`, `question_id` (FK -> questions), `selected_option`, `is_correct`, `time_spent_seconds`, `created_at`

6. **flashcards** — Cartoes de estudo
   - `id`, `user_id`, `subject_id`, `front`, `back`, `difficulty`, `last_reviewed_at`, `next_review_at`, `review_count`, `created_at`

7. **user_notes** — Anotacoes por disciplina
   - `id`, `user_id`, `subject_id`, `title`, `content`, `created_at`, `updated_at`

8. **study_materials** — Materiais de estudo (PDFs, links)
   - `id`, `user_id`, `subject_id`, `title`, `file_url`, `material_type` (pdf, link, text), `created_at`

Todas as tabelas terao RLS habilitado com politicas para que usuarios acessem apenas seus proprios dados.

---

## Fase 2C: Motor de Planejamento com IA (5 Vetores)

### Edge Function: `generate-study-plan`

Uma funcao backend que recebe os dados do usuario e gera/atualiza o plano de estudos usando Lovable AI (Gemini).

**Fluxo:**
1. Frontend envia: disciplinas, nivel de conhecimento, dados do concurso, disponibilidade
2. Edge function chama Lovable AI Gateway com tool calling para retornar dados estruturados
3. A IA calcula os 5 vetores para cada disciplina:
   - **Relevancia**: peso do tema para o concurso selecionado
   - **Incidencia**: frequencia historica em provas da banca
   - **Acuracia**: nivel de conhecimento informado + desempenho em questoes
   - **Desempenho**: horas estudadas + acertos em simulados
   - **Lacuna (Gap)**: risco de esquecimento baseado no tempo desde ultima revisao
4. Retorna um plano priorizado com horas recomendadas por disciplina
5. Dados salvos na tabela `study_plan`

### Edge Function: `generate-reviews`

Calcula as proximas revisoes espaçadas com base no desempenho e insere na tabela `spaced_reviews`.

---

## Fase 2D: Dashboard Completo com Abas

Transformar o dashboard basico em uma interface completa com navegacao lateral e abas:

### Estrutura de componentes:

```text
src/
  components/
    dashboard/
      Sidebar.tsx          -- Navegacao lateral com icones
      DashboardLayout.tsx  -- Layout com sidebar + conteudo
      OverviewTab.tsx      -- Visao geral (stats, graficos, revisoes pendentes)
      StudyPlanTab.tsx     -- Plano de estudos com 5 vetores, prioridades
      ReviewsTab.tsx       -- Revisoes espaçadas do dia, calendario
      QuestionsTab.tsx     -- Banco de questoes, simulados
      FlashcardsTab.tsx    -- Flashcards por disciplina
      MaterialsTab.tsx     -- Upload de PDFs, anotacoes, links
      NotesTab.tsx         -- Anotacoes por disciplina
      ProgressTab.tsx      -- Graficos de evolucao (recharts)
      SettingsTab.tsx      -- Perfil, preferencias, dados da conta
      StudyTimerTab.tsx    -- Cronometro Pomodoro/livre
```

### Abas e funcionalidades:

1. **Visao Geral** — Cards de stats, mensagem motivacional, revisoes do dia, grafico de horas semanais
2. **Plano de Estudos** — Tabela com disciplinas ordenadas por prioridade (5 vetores), botao "Gerar/Atualizar Plano com IA"
3. **Revisoes** — Lista de revisoes pendentes do dia, calendario com proximas revisoes, marcar como concluida com rating
4. **Questoes** — Criar questoes manualmente ou via IA, responder questoes, ver estatisticas de acerto
5. **Flashcards** — Criar, revisar (modo estudo), estatisticas de revisao
6. **Materiais** — Upload de PDFs (Supabase Storage), links, organizados por disciplina
7. **Anotacoes** — Editor de texto por disciplina/tema
8. **Progresso** — Graficos com recharts: evolucao por disciplina, horas estudadas, acuracia
9. **Cronometro** — Timer de estudo (Pomodoro ou livre), registra sessoes automaticamente
10. **Configuracoes** — Editar perfil, alterar concurso-alvo, reconfigurar disponibilidade

### Navegacao:

- Sidebar colapsavel em mobile (hamburger menu)
- URL por aba: `/dashboard?tab=overview`, `/dashboard?tab=plan`, etc.
- Icones consistentes com lucide-react

---

## Fase 2E: Teste End-to-End

Apos implementacao, testar:
1. Criar conta com email/senha
2. Verificar que onboarding aparece
3. Completar os 4 passos do wizard
4. Verificar que o dashboard carrega com dados do onboarding
5. Gerar plano de estudos com IA
6. Testar Google OAuth

---

## Detalhes Tecnicos

### Sequencia de implementacao:

1. Migracoes de banco (todas as tabelas + RLS)
2. Google OAuth via Cloud social auth tool
3. Edge functions (`generate-study-plan`, `generate-reviews`)
4. Componentes do dashboard (sidebar + todas as abas)
5. Integracao com dados reais (queries Supabase + recharts)
6. Teste do fluxo completo

### Dependencias existentes ja suficientes:
- `recharts` para graficos
- `framer-motion` para animacoes
- `date-fns` para datas
- `lucide-react` para icones
- `@supabase/supabase-js` para backend

### Storage:
- Criar bucket `study-materials` no Supabase Storage para PDFs
- Politicas de storage para acesso restrito ao usuario dono

