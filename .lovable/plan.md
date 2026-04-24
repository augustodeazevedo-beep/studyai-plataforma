## Plano de implementação — Planner adaptativo, Fila Agora e Auditoria

### Objetivo
Transformar o Planner em um fluxo contínuo e auditável: o sistema antecipa revisões com maior risco de esquecimento, recalcula o G-Force automaticamente após eventos relevantes, cria uma “Fila Agora” para a melhor próxima atividade e registra logs explicáveis de cada ajuste.

---

## 1. Regras de revisão antecipada pela curva do esquecimento

Implementar no motor determinístico (`src/lib/planner-adaptation.ts`) uma rotina de “risco de esquecimento” que cruza:

- dias desde a última sessão/revisão da disciplina;
- intervalo SRS atual (`spaced_reviews.interval_days`);
- compreensão registrada (`study_sessions.comprehension_rating`);
- acurácia recente (`question_attempts.is_correct`);
- prioridade G-Force (`study_plan.priority_score`);
- estado Psique atual, para ajustar volume sem punição.

Comportamento esperado:

- revisões com alto risco serão antecipadas para hoje ou para o próximo dia útil de estudo;
- o calendário criará ou atualizará blocos do tipo “Revisão SRS antecipada”;
- blocos novos respeitarão duração leve em dias de baixa energia/foco;
- revisões atrasadas sempre entram antes de conteúdo novo, salvo se o estado Psique exigir uma tarefa mais leve.

---

## 2. Recálculo automático do G-Force sem botão manual

A função atual `recalculateAndPersistPlan(userId)` já existe, mas será ampliada e usada como evento automático.

Disparadores no cliente:

- ao registrar uma sessão real no Planner (`study_sessions.duration_minutes` e `comprehension_rating`);
- ao editar duração/compreensão/performance de uma sessão existente, se a edição for adicionada;
- ao registrar questões na aba Análise (`question_attempts`);
- ao completar revisão SRS no Coach;
- ao mover, criar ou excluir blocos do calendário;
- ao salvar check-in de Bem-Estar, mantendo a adaptação psíquica já existente.

O botão “Recalcular” deixa de ser a ação principal e passa a ser uma opção secundária de diagnóstico/forçar sincronização.

---

## 3. “Fila Agora” no Planner

Criar uma seção fixa no topo ou lateral do Planner chamada “Fila Agora”, baseada na melhor próxima atividade naquele momento.

A fila vai ordenar atividades por prioridade:

1. Revisões vencidas ou com risco alto de esquecimento;
2. Próxima Ação G-Force crítica/alta;
3. Blocos de hoje ainda não executados;
4. Atividades leves quando Psique estiver baixa;
5. Manutenção/revisão quando o usuário estiver fora do plano do dia.

Cada item terá:

- tipo: revisão, questões, leitura ativa, flashcards, bloco planejado;
- disciplina;
- duração sugerida;
- justificativa curta (“alto risco de esquecimento”, “baixa compreensão + alta relevância”, “dia leve: preservar consistência”);
- botão “Começar agora”.

---

## 4. Botão “Ir para o bloco”

Adicionar na Próxima Ação G-Force e na Fila Agora um botão “Ir para o bloco”.

Comportamento:

- se já existir um bloco compatível no calendário de hoje, ele será realçado visualmente;
- se não existir, o sistema criará automaticamente um bloco para hoje com a disciplina/duração/formato sugeridos;
- o calendário navegará para o mês/data correspondente;
- o bloco recém-criado ou encontrado receberá destaque temporário para orientar o usuário;
- se o usuário estiver em modo Psique baixo, o bloco será criado em formato leve e menor duração.

---

## 5. Tela de Auditoria dentro do Planner

Criar uma área “Auditoria” no Planner, preferencialmente como abas internas:

- Calendário
- Fila Agora
- Auditoria

A Auditoria exibirá logs de recálculo com:

- quando ocorreu;
- gatilho: sessão registrada, questão registrada, revisão concluída, check-in, bloco movido, recálculo manual;
- o que mudou: disciplina, score anterior/novo, minutos alterados, revisão antecipada;
- por quê: explicação baseada nos 5 vetores e/ou risco de esquecimento;
- status: sucesso, sem mudança, erro tratado;
- sem expor dados de outros usuários.

---

## 6. Banco de dados e segurança

Adicionar uma nova tabela não destrutiva para logs:

```sql
planner_audit_logs
- id uuid primary key
- user_id uuid not null
- event_type text not null
- event_source text not null
- subject_id uuid null
- before_state jsonb null
- after_state jsonb null
- explanation text not null
- metadata jsonb null
- created_at timestamptz default now()
```

Políticas RLS:

- usuários autenticados só podem inserir seus próprios logs;
- usuários autenticados só podem visualizar seus próprios logs;
- não será criada permissão pública;
- não haverá alteração destrutiva em tabelas existentes.

Também avaliarei adicionar campos opcionais em `study_calendar_blocks` para melhorar a inteligência do calendário:

```sql
block_type text default 'study'
cognitive_load text default 'medium'
auto_generated boolean default false
source text default 'manual'
```

Essas alterações são aditivas e seguras. Não removem dados.

---

## 7. Ajustes técnicos previstos

Arquivos principais:

- `src/lib/planner-adaptation.ts`
  - adicionar cálculo de risco de esquecimento;
  - adicionar geração da Fila Agora;
  - adicionar criação/realce de bloco sugerido;
  - adicionar logging de auditoria;
  - substituir `delete + insert` do `study_plan` por atualização mais cuidadosa, quando possível.

- `src/lib/adaptive-algorithm.ts`
  - expor helpers para explicar mudanças de score;
  - refinar cálculo de intensidade/compreensão com dados recentes.

- `src/components/dashboard/PlannerTab.tsx`
  - UI da Fila Agora;
  - botão “Ir para o bloco”;
  - destaque temporário do bloco;
  - abas internas Calendário/Fila/Auditoria;
  - gatilhos automáticos de recálculo em sessão/blocos.

- `src/components/dashboard/AnalysisTab.tsx`
  - chamar recálculo automático após registrar questões;
  - registrar log de auditoria.

- `src/components/dashboard/CoachTab.tsx`
  - ao completar revisão, recalcular G-Force;
  - antecipar próxima revisão quando risco alto;
  - registrar log.

- `src/components/dashboard/PsycheTab.tsx`
  - manter adaptação diária e registrar log explicável.

- `supabase/functions/export-user-data/index.ts`
  - incluir `planner_audit_logs` no export LGPD, se a tabela for criada.

---

## 8. Critérios de aceite

A implementação será considerada concluída quando:

- registrar uma sessão recalcula o G-Force automaticamente;
- registrar questões recalcula o G-Force automaticamente;
- completar revisão recalcula e reprograma revisões futuras;
- revisões com alto risco aparecem na Fila Agora antes de conteúdo novo;
- o botão “Ir para o bloco” cria ou realça o bloco correto no calendário;
- a tela Auditoria mostra logs claros, filtrados por usuário e sem vazamento de dados;
- build do projeto passa sem erros.

---

## Observação importante
Não farei migrações destrutivas. As mudanças de banco serão apenas aditivas e protegidas por RLS.