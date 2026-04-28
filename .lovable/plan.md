Plano de implementação

1. Mover a edição dos vetores para o nível de tópico
- Remover os controles editáveis de Relevância, Incidência e Compreensão do card da disciplina.
- Manter no cabeçalho da disciplina apenas um resumo derivado dos tópicos, por exemplo médias dos vetores dos tópicos, para o usuário entender o panorama da disciplina.
- Em cada lista de “Tópicos previstos”, exibir os tópicos em formato de tabela/bloco mobile-first com três colunas editáveis:
  - Relevância
  - Incidência
  - Compreensão
- Cada pontuação será uma nota decimal de 1 a 5, editável por campo numérico compacto, com `step=0.1`, `min=1`, `max=5`.
- Normalizar qualquer valor digitado para número decimal seguro entre 1 e 5 antes de salvar.

2. Persistir os vetores por tópico
- Criar campos específicos na tabela `topics` para guardar as pontuações por tópico:
  - `relevance_score numeric default 3`
  - `incidence_score numeric default 3`
  - `comprehension_score numeric default 3`
- Não alterar a lógica de autenticação/RLS, pois a tabela `topics` já possui políticas para o próprio usuário criar, ver e atualizar seus tópicos.
- Ao criar tópico manualmente, salvar os três vetores com defaults seguros, provavelmente herdando as notas médias/atuais da disciplina ou usando 3 como neutro.
- Ao importar tópicos via IA, preencher esses campos com as notas estimadas pela IA quando disponíveis; quando não houver score individual, usar os scores da disciplina como fallback seguro.

3. Sincronizar o G-Force da disciplina a partir dos tópicos
- Após cada edição de vetor de tópico, recalcular os vetores agregados da disciplina usando a média dos tópicos daquela disciplina.
- Atualizar `user_subjects.weight`, `user_subjects.incidence` e `user_subjects.knowledge_level` com esses agregados, para manter compatibilidade com o algoritmo G-Force atual.
- Recalcular e persistir o `study_plan` via `recalculateAndPersistPlan`, mantendo Análise, Planner e recomendações coerentes.
- Registrar auditoria em `planner_audit_logs` indicando ajuste manual em vetor G-Force de tópico, com antes/depois, `topicId`, `topicName`, `subjectId` e campo alterado.

4. Ajustar o processador de edital com IA
- Atualizar o contrato/prompt do `process-edital` para orientar a IA a atribuir Relevância, Incidência e Compreensão também por tópico específico.
- Manter as validações robustas já implementadas: números/string numérica, clamp entre 1 e 5, normalização e logs por `submissionId`.
- Persistir os scores no insert/update de tópicos e usar agregação para atualizar as disciplinas importadas.

5. Adicionar tutorial simplificado acima de “Adicionar Nova Disciplina”
- Inserir um único bloco explicativo antes do container de adição de disciplina.
- Conteúdo objetivo e pedagógico:
  - o que significa cada vetor;
  - por que revisar as notas da IA;
  - como notas de 1 a 5 influenciam a priorização do estudo;
  - reforço de que essas pontuações são centrais para a proposta da Study.AI: estudo eficiente, efetivo, científico e alinhado à neurociência da aprendizagem.
- Manter linguagem empática, não punitiva e mobile-first.

6. Verificação
- Rodar build/typecheck após implementação.
- Confirmar o fluxo completo:
  - IA importa disciplinas e tópicos;
  - tópicos aparecem com três notas editáveis em colunas;
  - usuário altera nota decimal;
  - tópico salva;
  - disciplina recebe médias atualizadas;
  - plano G-Force é recalculado;
  - auditoria é registrada;
  - novos tópicos manuais já nascem com defaults seguros.

Detalhes técnicos

- UI principal: `src/components/dashboard/ArsenalTab.tsx`.
- Processador de edital: `supabase/functions/process-edital/index.ts`.
- Schema: adicionar colunas numéricas em `topics`; não editar arquivos gerados de integração.
- Estratégia de compatibilidade: o G-Force atual continua usando `user_subjects`, mas os valores passam a ser derivados dos tópicos quando existirem tópicos pontuados.
- Formato de edição: decimal de 1 a 5, com salvamento por tópico/campo e feedback visual de carregamento.