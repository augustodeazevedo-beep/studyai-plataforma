
# Auditoria da Moldura Didática G-Force — Study.AI

## Veredito geral

A **arquitetura conceitual** do G-Force (Constituição Study.AI + 5 vetores) está bem traduzida em código nas camadas de **análise** e **IA**, mas existe uma **fratura crítica entre o cérebro (algoritmo) e o corpo (Planner)**: o calendário de estudos é uma agenda manual desacoplada das prioridades calculadas. A plataforma "pensa adaptativamente, mas não age adaptativamente".

---

## O que está correto (pontos fortes)

### 1. Constituição pedagógica centralizada
`supabase/functions/_shared/study-ai-base-prompt.ts` codifica os princípios (carga cognitiva, neurodivergência, empatia, 5 vetores) e é injetada em **todas** as Edge Functions de IA (`ai-coach`, `ai-professor`, `professor-tools`, `generate-study-plan`, `predict-cycle`). Isso garante coerência didática nas respostas da IA. ✅

### 2. Algoritmo G-Force formalizado
`src/lib/adaptive-algorithm.ts` implementa corretamente:
- 5 vetores com pesos `(R×3 + I×2 + C×2 + In×1 + P×2) / 10`
- Inversão semântica da Compreensão (gap) e Stress
- Composição do Psique a partir de mood + stress + energy + focus + sleep
- Função `applyScheduleAdjustments()` que **já existe** para distribuir minutos diários proporcional ao G-Force
- Ajuste dinâmico de tempo sugerido conforme estado psíquico (`×0.6` em dias ruins, `×1.1` em dias bons)

### 3. Integração na aba Análise
`AnalysisTab.tsx` consome o algoritmo, alimenta o radar e gera recomendações categorizadas (crítica/alta/média/baixa). ✅

### 4. Geração inicial via IA
`generate-study-plan/index.ts` usa Gemini com a Constituição + contexto Psique para popular `study_plan` com os 5 vetores por disciplina. ✅

---

## Lacunas críticas identificadas

### LACUNA 1 — Planner é um calendário "burro" 🔴 (mais grave)
`PlannerTab.tsx` opera **exclusivamente** sobre `study_calendar_blocks`:
- Não lê `study_plan` (priority_score, recommended_hours_weekly)
- Não lê `psyche_checkins` nem `psyche_profiles`
- Não importa nada de `adaptive-algorithm.ts`
- A função `applyScheduleAdjustments()` **existe mas nunca é chamada em lugar nenhum** do app

**Consequência:** quando o usuário arrasta um bloco no calendário, nada se recalibra. O claim de memória `features/estudos-dinamicos` ("recalibração automática quando blocos são arrastados") **não está implementado**.

### LACUNA 2 — Check-in diário não dispara adaptação
Quando o usuário faz um check-in em PsycheTab (humor 1, estresse 5), nenhum bloco do dia é redimensionado, removido ou substituído por formatos de menor carga cognitiva. O vetor Psique só afeta a IA quando ela é explicitamente chamada — não há reação automática no calendário.

### LACUNA 3 — `study_plan` é um snapshot estático
A tabela é populada apenas quando o usuário clica em "Gerar Plano". Não há trigger/recálculo quando:
- Uma sessão de estudo é registrada (muda Intensidade)
- Tentativas de questões mudam acurácia (muda Compreensão)
- Check-in psíquico muda (muda Psique)
- Data da prova se aproxima (deveria amplificar urgência)

### LACUNA 4 — Ausência de "modulação por formato"
A Constituição prescreve **multi-armed bandit pedagógico** (em dia ruim → flashcards curtos; em dia bom → blocos densos). O schema `study_calendar_blocks` só tem `subject_id` + `duration_minutes` + `material_name` — não há campo de **tipo/formato cognitivo** do bloco, então a IA não consegue substituir formato dinamicamente.

### LACUNA 5 — Neurodivergência declarada mas pouco usada operacionalmente
`psyche_profiles.neurodivergence_type` (TDAH/TEA/Dislexia) e `attention_span_minutes` existem, mas:
- O Pomodoro do Planner é fixo em 25 min (não inicia com `attention_span_minutes` do perfil)
- Blocos longos não são auto-fragmentados para perfis TDAH
- Nenhuma regra TEA (rotina/previsibilidade) ou dislexia (preferência por áudio/visual) afeta seleção de material

### LACUNA 6 — Sem margem de segurança aplicada
A Constituição prescreve **margem 10–20% para dias improdutivos**. `predict-cycle` menciona isso no prompt, mas a distribuição em `applyScheduleAdjustments` consome 100% do tempo disponível.

---

## Plano de correção — tornar a moldura realmente adaptativa

### Fase 1 — Conectar Planner ao G-Force (núcleo da correção)

1. **Recálculo automático em mudanças do calendário**
   - Após drag-drop, insert ou delete de bloco em `PlannerTab`, chamar `calculateDisciplinePriorities()` e re-balancear horas restantes da semana usando `applyScheduleAdjustments()`.
   - Mostrar toast: "Cronograma recalibrado: +20min Direito Constitucional na quinta".

2. **Painel "Próxima Ação Recomendada" no Planner**
   - Card lateral que lê `study_plan` ordenado por `priority_score` e sugere o próximo bloco a fazer hoje, com justificativa nos 5 vetores.

3. **Botão "Gerar semana adaptativa"**
   - Nova Edge Function `generate-weekly-schedule` que pega `study_plan` + `psyche_checkins` (últimos 7 dias) + `daily_hours` × `study_days` e popula `study_calendar_blocks` automaticamente, aplicando margem de 15%.

### Fase 2 — Reatividade psíquica diária

4. **Hook `usePsycheAdaptation`**
   - Ao salvar um check-in, se `(mood + energy + focus)/3 ≤ 2`: marcar blocos do dia como "modo leve" (reduz duração em 40%, sugere flashcards/revisão em vez de matéria nova).
   - Se estado for ótimo: oferecer adicionar bloco extra em disciplina crítica.

5. **Pomodoro adaptativo**
   - `pomodoroMinutes` inicial = `psyche_profiles.attention_span_minutes` (default 25).
   - Em dias de baixa energia, sugerir 15min; em dias bons, 45min.

### Fase 3 — `study_plan` vivo (recálculo contínuo)

6. **Trigger de recálculo leve no cliente**
   - Após cada `study_session` registrada, cada `question_attempt` salvo, cada `psyche_checkin` criado: re-rodar `calculateDisciplinePriorities` localmente e atualizar `study_plan` com upsert (sem chamar IA — apenas a fórmula determinística). A IA só é re-invocada semanalmente ou sob demanda.

7. **Vetor Urgência (data da prova)**
   - Adicionar 6º componente derivado em `adaptive-algorithm.ts`: `urgencyMultiplier = exam_date proximity`. Disciplinas com baixa compreensão ganham boost à medida que a prova se aproxima.

### Fase 4 — Modulação por formato cognitivo

8. **Migração de schema**
   - Adicionar `study_calendar_blocks.cognitive_load` (`light` | `medium` | `heavy`) e `block_type` (`new_content` | `practice` | `review` | `flashcards`).
   - IA escolhe formato com base no estado Psique do dia agendado.

### Fase 5 — Operacionalizar neurodivergência

9. **Regras por perfil ND**
   - TDAH: auto-fragmentar blocos > `attention_span_minutes` em sub-blocos com pausas de 5min.
   - TEA: priorizar consistência de horário (mesmo bloco no mesmo horário) e avisar antes de mudanças.
   - Dislexia: marcar materiais com `material_type` preferido (áudio/vídeo) na seleção.

---

## Detalhes técnicos (para o time)

**Arquivos a tocar:**
- `src/lib/adaptive-algorithm.ts` — adicionar `urgencyMultiplier`, função `recalculateAndPersistPlan(userId)` que faz upsert em `study_plan` sem IA.
- `src/components/dashboard/PlannerTab.tsx` — importar adaptive-algorithm, painel lateral de prioridades, hook de recálculo pós drag-drop, Pomodoro adaptativo.
- `src/components/dashboard/PsycheTab.tsx` — após `INSERT psyche_checkin`, disparar `applyDailyAdaptation()`.
- `supabase/functions/generate-weekly-schedule/index.ts` — nova função para popular calendário automaticamente.
- Migração SQL: `study_calendar_blocks` ganha `cognitive_load` e `block_type`.

**Princípio de design:** algoritmo determinístico no cliente para reatividade instantânea; IA reservada para decisões semanais e justificativas em linguagem natural (economia de tokens e baixa latência).

---

## Resumo executivo

| Camada | Status atual | Necessário |
|---|---|---|
| Constituição pedagógica (prompts) | ✅ Implementada | — |
| Algoritmo G-Force (matemática) | ✅ Implementado | + Urgência + persistência contínua |
| Análise / Radar | ✅ Funciona | — |
| Geração inicial do plano (IA) | ✅ Funciona | — |
| **Planner adaptativo** | 🔴 **Desconectado** | **Reescrever para consumir G-Force** |
| Reação a check-ins diários | 🔴 Inexistente | Hook de adaptação automática |
| Modulação por formato cognitivo | 🔴 Inexistente | Schema + lógica de seleção |
| Operacionalização ND | 🟡 Parcial | Regras TDAH/TEA/Dislexia no calendário |

A "moldura didática" está **bem desenhada conceitualmente** mas só **traduz parcialmente o pensamento** descrito. As Fases 1 e 2 são suficientes para que o usuário **sinta** a plataforma como verdadeiramente adaptativa; as Fases 3–5 elevam o sistema ao nível prometido pela Constituição.
