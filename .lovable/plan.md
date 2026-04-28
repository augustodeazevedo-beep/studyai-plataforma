Plano de implementação

1. Restaurar edição dos 3 vetores no Arsenal
- Em cada card de disciplina, adicionar controles editáveis para:
  - Relevância (`weight`)
  - Incidência (`incidence`)
  - Compreensão/Conhecimento (`knowledge_level`)
- Usar controles mobile-first e fáceis de ajustar, provavelmente sliders 1–5 com valor visível e alternativa por input numérico compacto.
- Adicionar estado visual de salvamento por disciplina para evitar cliques duplicados.
- Validar sempre valores inteiros de 1 a 5 antes de salvar.

2. Persistir alterações e recalcular o G-Force
- Ao alterar um vetor, atualizar `user_subjects` somente para a disciplina do próprio usuário.
- Recalcular/atualizar o `study_plan` correspondente para manter Análise, Planner e recomendações coerentes.
- Para Relevância e Incidência, atualizar também a linha existente em `study_plan` dessa disciplina quando houver plano.
- Para Compreensão, refletir no recálculo do plano via algoritmo adaptativo, já que ela entra no vetor de lacuna/compreensão.
- Registrar auditoria em `planner_audit_logs` usando o mecanismo existente, com motivo claro: ajuste manual do usuário nos vetores G-Force.

3. Melhorar visibilidade dos tópicos importados do edital
- Ajustar a exibição da lista de tópicos dentro de cada disciplina para facilitar revisão pós-IA.
- Quando uma disciplina não tiver tópicos, mostrar um estado vazio orientando o usuário a adicionar manualmente tópicos previstos que a IA não identificou.
- Manter a opção de adicionar tópico manualmente em cada disciplina.
- Opcionalmente, destacar no resumo de processamento quantos tópicos foram adicionados e quantos foram ignorados por deduplicação.

4. Melhorar o prompt/contrato do processador de edital para extrair tópicos mais completos
- Refinar o prompt da função `process-edital` para exigir que a IA extraia tópicos específicos do conteúdo programático, não apenas disciplinas genéricas.
- Orientar a IA a preservar itens previstos no edital como tópicos/subtópicos quando possível, com nomes curtos e úteis ao estudante.
- Manter o limite de tamanho e a normalização já implementados para evitar novos erros 422.

5. Verificação
- Rodar build/typecheck para garantir que a interface compile.
- Se a função `process-edital` for alterada, redeploy da função após aprovação.
- Testar mentalmente o fluxo: upload/processamento do edital → disciplinas/tópicos aparecem → usuário edita relevância/incidência/compreensão → plano é atualizado sem duplicar dados.

Detalhes técnicos

- Arquivo principal de UI: `src/components/dashboard/ArsenalTab.tsx`.
- Backend de processamento: `supabase/functions/process-edital/index.ts`.
- Tabelas usadas:
  - `user_subjects`: fonte dos vetores editáveis (`weight`, `incidence`, `knowledge_level`).
  - `topics`: tópicos por disciplina.
  - `study_plan`: plano e pontuação derivados dos vetores.
  - `planner_audit_logs`: auditoria das alterações do usuário.
- Não deve ser necessária mudança de schema, pois os campos dos 3 vetores já existem.