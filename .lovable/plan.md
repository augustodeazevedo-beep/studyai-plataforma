Plano revisado para a aba Arsenal, processamento de edital e cálculo G-Force:

1. Preservar a arquitetura dos 5 vetores G-Force
- O processamento do edital não será apenas “extração de disciplinas”. Ele passará a alimentar corretamente os vetores usados para máxima eficiência e efetividade dos estudos:
  - Relevância: peso/importância da disciplina ou tema no edital específico.
  - Incidência: recorrência histórica em provas anteriores ou similares, especialmente da mesma banca e cargo.
  - Compreensão: informada pelo usuário no Arsenal e refinada pelos registros diários de sessões no Planner.
  - Psique: oriunda das respostas e check-ins da aba Bem Estar.
  - Intensidade: calculada com base no histórico real de estudos diários, sessões e dedicação.

2. Backend: consulta pública assistida por IA para Relevância e Incidência
- Ajustar o fluxo de `process-edital` para não depender apenas de inferência genérica da IA.
- Adicionar uma etapa backend de pesquisa/consulta pública para fundamentar Relevância e Incidência com base em fontes abertas, priorizando:
  - sites oficiais das bancas organizadoras;
  - editais anteriores;
  - provas e gabaritos anteriores;
  - conteúdos programáticos de cargos semelhantes;
  - páginas públicas confiáveis quando a fonte oficial for insuficiente.
- A IA deverá receber o edital atual + contexto do concurso/cargo/banca + achados públicos para sugerir notas de Relevância e Incidência.
- O retorno poderá incluir, quando disponível, uma justificativa curta e fontes consultadas para cada disciplina/tema.

3. Backend: validação forte de schema
- Manter e ampliar validação com Zod em `process-edital` para garantir:
  - `editalText` válido;
  - metadados opcionais seguros (`targetExam`, `targetPosition`, `banca`);
  - `forceReprocess` opcional;
  - resposta da IA com `subjects[]`, `topics[]`, `relevance`, `incidence`, justificativas e fontes no formato esperado.
- Em caso de formato inválido, retornar erro claro e amigável, sem inserir dados parciais corrompidos.

4. Backend: unicidade e índices contra duplicações simultâneas
- Criar migração de banco para deduplicação segura em nível estrutural.
- Adicionar normalização de nomes no banco para comparação consistente, tratando caixa, espaços e acentos básicos.
- Criar índices/constraints únicos para:
  - disciplinas: `user_id + disciplina normalizada`;
  - tópicos: `user_id + subject_id + tópico normalizado`;
  - plano: `user_id + subject_id`.
- Antes de aplicar índices únicos, verificar e tratar duplicados existentes para evitar falha de migração.

5. Backend: modo normal vs. Reprocessar edital
- Modo normal:
  - inserir disciplinas/tópicos/planos novos;
  - ignorar os já existentes;
  - retornar exatamente o que foi inserido e o que foi ignorado.
- Modo “Reprocessar edital”:
  - ignorar a idempotência de atualização, mas não duplicar registros;
  - atualizar peso/relevância e incidência de disciplinas já existentes;
  - atualizar o `study_plan` correspondente;
  - manter tópicos existentes e adicionar apenas novos tópicos detectados;
  - retornar valores anteriores e novos quando houver atualização.

6. Backend: resumo detalhado do processamento
- Alterar o retorno de `process-edital` para incluir um resumo detalhado por categoria:
  - disciplinas inseridas;
  - disciplinas ignoradas;
  - disciplinas atualizadas;
  - tópicos inseridos;
  - tópicos ignorados;
  - planos inseridos;
  - planos ignorados;
  - planos atualizados.
- Cada item terá nome, motivo e, quando aplicável, Relevância/Incidência anterior e nova.
- Quando houver fontes públicas consultadas, o resumo poderá exibir referências resumidas para justificar a pontuação.

7. Frontend: validação de PDF/arquivo antes de chamar a função
- Em `ArsenalTab.tsx`, rejeitar antes da chamada ao backend:
  - arquivo ausente;
  - arquivo vazio;
  - arquivo acima do limite permitido;
  - extensão diferente de `.pdf`;
  - MIME inválido quando disponível;
  - arquivo sem assinatura `%PDF-` no início.
- Exibir toast amigável em português explicando o problema e orientando a usar “Colar Texto” quando o PDF for escaneado ou ilegível.

8. Frontend: opção “Reprocessar edital”
- Adicionar opção visual na aba Arsenal, próxima ao botão principal.
- Quando desativada: processamento idempotente, sem atualizar itens existentes.
- Quando ativada: recalcula e atualiza Relevância/Incidência e plano dos itens existentes, sem duplicar disciplinas/tópicos.
- Ajustar o texto do botão para deixar claro o modo atual.

9. Frontend: painel de resumo pós-processamento
- Exibir no Arsenal um card de resultado após o processamento.
- O card mostrará contadores e listas compactas do que foi:
  - inserido;
  - ignorado;
  - atualizado.
- Organizar por Disciplinas, Tópicos e Planos.
- Seguir o padrão visual atual: dark theme, cards `glass`, `rounded-xl`, mobile-first e texto objetivo.

10. Integração com Planner e eficiência/efetividade
- Garantir que os dados inseridos/atualizados no Arsenal alimentem corretamente o `study_plan`.
- Manter Compreensão, Psique e Intensidade como vetores dinâmicos derivados do uso real:
  - Compreensão: Arsenal + sessões/avaliações no Planner;
  - Psique: Bem Estar;
  - Intensidade: registros diários de estudo.
- O cálculo final deverá ponderar os 5 vetores para priorizar o maior ganho possível: cobrir mais temas do edital sem perder foco nas disciplinas de maior impacto para nota/aprovação.

Detalhes técnicos:
- A consulta pública com IA será feita no backend, nunca no frontend, para manter prompts, chaves e lógica sensível protegidos.
- A deduplicação crítica ficará no banco por índices/constraints, não apenas em código, para suportar requisições simultâneas.
- O frontend apenas valida entrada, coleta consentimento do modo “Reprocessar edital” e renderiza o resumo retornado.
- Após aprovação, também registrarei essa regra de negócio na memória do projeto para que futuras alterações respeitem a origem de cada vetor G-Force.