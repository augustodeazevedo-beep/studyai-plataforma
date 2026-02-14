

# AUDITORIA COMPLETA - COGNOS Study.AI

## 1. RESUMO EXECUTIVO

A plataforma esta bem estruturada no geral, com autenticacao funcional, RLS em todas as tabelas, e edge functions com validacao de usuario. No entanto, existem **15 problemas** identificados em 6 categorias, sendo **4 criticos**, **6 moderados** e **5 menores**.

---

## 2. SEGURANCA

### 2.1 Problemas Criticos

**[CRITICO] Protecao contra senhas vazadas desabilitada**
- O linter do banco detectou que a protecao contra senhas vazadas (leaked password protection) esta desativada. Usuarios podem cadastrar senhas que ja foram comprometidas em vazamentos de dados.
- **Correcao:** Habilitar nas configuracoes de autenticacao.

**[CRITICO] Sem foreign keys entre tabelas**
- Nenhuma tabela possui chaves estrangeiras. Isso significa que:
  - `topics.subject_id` pode referenciar um subject_id inexistente
  - `study_plan.subject_id` pode apontar para disciplinas deletadas
  - `flashcards.subject_id`, `study_sessions.subject_id`, etc. sem integridade referencial
  - Ao deletar uma disciplina no Arsenal, os topicos, sessoes, flashcards e planos orfaos permanecem no banco
- **Correcao:** Adicionar foreign keys com `ON DELETE CASCADE` para as relacoes user_id e subject_id.

**[CRITICO] Funcao `registerQuestions` no AnalysisTab e fake**
- A funcao `registerQuestions` (linha 69-73 de AnalysisTab.tsx) apenas exibe um toast de sucesso sem salvar NADA no banco de dados. O formulario de "Registro de Questoes" e completamente inoperante.
- **Correcao:** Implementar a logica real que cria registros em `questions` e `question_attempts`.

**[CRITICO] Conquistas nunca sao desbloqueadas automaticamente**
- A aba Conquistas lista 12 badges, mas NAO existe nenhum mecanismo (trigger, cron, ou logica no frontend) que desbloqueie conquistas automaticamente. Os badges permanecem eternamente trancados.
- **Correcao:** Criar logica de verificacao (trigger no banco ou checagem no frontend) que avalia criterios e insere em `user_achievements`.

### 2.2 Problemas Moderados de Seguranca

**[MODERADO] Edge functions com `verify_jwt = false`**
- Todas as 7 edge functions no `config.toml` estao com `verify_jwt = false`. Embora cada funcao valide o `Authorization` header manualmente, desabilitar a verificacao JWT no gateway remove uma camada de protecao.
- **Correcao:** Remover `verify_jwt = false` do config.toml (o default e `true`).

**[MODERADO] CORS `Access-Control-Allow-Origin: *`**
- Todas as edge functions permitem qualquer origem. Em producao, isso deve ser restrito ao dominio da aplicacao.

**[MODERADO] Storage sem restricao de tamanho ou tipo de arquivo**
- O bucket `study-materials` nao tem `file_size_limit` nem `allowed_mime_types`. Usuarios podem fazer upload de arquivos de qualquer tamanho e tipo.
- **Correcao:** Definir limites (ex: 50MB, tipos PDF/DOCX/imagens).

---

## 3. LOGICA E FUNCIONALIDADES

### 3.1 Funcionalidades Ausentes ou Incompletas

**[MODERADO] Heatmap de intensidade usa apenas as 10 ultimas sessoes**
- O PlannerTab carrega apenas `limit(10)` sessoes (linha 56), mas o heatmap tenta renderizar 90 dias. Na pratica, so mostra dados de no maximo 10 sessoes recentes, nao o historico completo.
- **Correcao:** Fazer query separada para o heatmap buscando sessoes dos ultimos 90 dias sem limite.

**[MODERADO] `generate-study-plan` nunca e chamado no frontend**
- A edge function `generate-study-plan` existe e esta funcional, mas NAO ha nenhum botao ou chamada no frontend que a invoque. O plano de estudos (tabela `study_plan`) so pode ser populado via API direta.
- **Correcao:** Adicionar um botao "Gerar Plano com IA" na aba Analise ou Planner.

**[MODERADO] `generate-reviews` nunca e chamado no frontend**
- A edge function de revisoes espacadas existe, mas nao ha interface para agenda-las ou completa-las. A aba de revisoes espacadas nao existe como tab.
- **Correcao:** Criar interface de revisoes ou integrar na aba Analise.

**[MENOR] Flashcards sem interface**
- A tabela `flashcards` existe com RLS configurado, mas nao ha nenhuma aba ou componente no frontend para criar/revisar flashcards. A funcionalidade esta apenas no banco.

**[MENOR] `study_materials` sem interface completa**
- A tabela e o bucket de storage existem, mas nao ha interface para upload/download de materiais na aba Arsenal ou Cadernos.

### 3.2 Bugs de Logica

**[MENOR] Banca do onboarding nao e salva**
- O campo "Banca organizadora" coletado no Onboarding (variavel `banca`) nunca e salvo no banco. A tabela `profiles` nao tem coluna `banca`.

**[MENOR] Deletar disciplina no Arsenal nao limpa dados relacionados**
- Ao deletar um `user_subject`, os registros orfaos em `topics`, `study_sessions`, `study_plan`, `flashcards`, `spaced_reviews`, `study_materials`, e `study_calendar_blocks` permanecem. Sem foreign keys com CASCADE, esses dados ficam orfaos.

**[MENOR] Professor.IA fallback para anon key**
- Na linha 42 de ProfessorTab.tsx, se nao houver token de sessao, o codigo faz fallback para a anon key. Isso nao deveria acontecer pois o usuario precisa estar autenticado.

---

## 4. BASE DE DADOS

### 4.1 Estado Atual

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE | Trigger updated_at |
|--------|-----|--------|--------|--------|--------|-------------------|
| profiles | OK | OK | OK | OK | Sem policy | Sim |
| user_subjects | OK | OK | OK | OK | OK | Sim |
| topics | OK | OK | OK | OK | OK | Nao |
| study_sessions | OK | OK | OK | OK | OK | Nao |
| study_calendar_blocks | OK | OK | OK | OK | OK | Sim |
| study_plan | OK | OK | OK | OK | OK | Sim |
| questions | OK | OK | OK | OK | OK | Nao |
| question_attempts | OK | OK | OK | Sem | Sem | Nao |
| flashcards | OK | OK | OK | OK | OK | Nao |
| user_notes | OK | OK | OK | OK | OK | Sim |
| spaced_reviews | OK | OK | OK | OK | OK | Nao |
| study_materials | OK | OK | OK | OK | OK | Nao |
| reminders | OK | OK | OK | OK | OK | Nao |
| ai_coaching_history | OK | OK | OK | Sem | OK | Nao |
| user_achievements | OK | OK | OK | Sem | Sem | Nao |
| user_roles | OK | OK | Admin | Admin | Sem | Nao |

### 4.2 Trigger `handle_new_user`
- Funcionando corretamente: cria perfil e role "user" ao registrar novo usuario.

---

## 5. ACESSO E AUTENTICACAO

- Login por email/senha: **Funcional**
- Login por Google OAuth (Lovable Cloud): **Funcional**
- Onboarding redirect: **Funcional**
- Protecao de rotas: **Funcional** (Dashboard redireciona para /auth se nao autenticado)
- Logout: **Funcional**

---

## 6. PLANO DE CORRECAO (Priorizado)

### Fase 1 - Criticos (implementacao imediata)

1. **Adicionar foreign keys com CASCADE** em todas as tabelas que referenciam `user_subjects.id` (topics, study_sessions, study_plan, flashcards, spaced_reviews, study_materials, study_calendar_blocks, questions)
2. **Corrigir `registerQuestions`** no AnalysisTab para realmente salvar questoes e tentativas no banco
3. **Implementar desbloqueio automatico de conquistas** com verificacao apos cada sessao/acao relevante
4. **Habilitar leaked password protection**

### Fase 2 - Moderados

5. **Corrigir query do heatmap** para buscar sessoes dos ultimos 90 dias sem limite de 10
6. **Adicionar botao "Gerar Plano com IA"** no frontend, conectando a edge function `generate-study-plan`
7. **Criar interface de revisoes espacadas** conectando a edge function `generate-reviews`
8. **Configurar `verify_jwt = true`** nas edge functions (remover linhas do config.toml)
9. **Definir limites no bucket** study-materials (tamanho e tipos)

### Fase 3 - Menores

10. **Criar interface de Flashcards** como nova aba
11. **Criar interface de upload de materiais** no Arsenal
12. **Adicionar coluna `banca`** na tabela profiles e salvar no onboarding
13. **Remover fallback para anon key** no ProfessorTab
14. **Restringir CORS** nas edge functions para o dominio da aplicacao

### Detalhes Tecnicos

As correcoes da Fase 1 envolvem:
- 1 migration SQL para foreign keys
- Reescrita de ~30 linhas em AnalysisTab.tsx
- Criacao de funcao `checkAchievements` (~80 linhas) chamada apos sessoes e marcos
- Configuracao de auth via ferramenta de configuracao

As correcoes da Fase 2 envolvem:
- Ajuste de 1 linha no PlannerTab (remover limit)
- Novo componente ou secao (~100 linhas) para botao de geracao de plano
- Novo componente ReviewsTab (~150 linhas)
- Edicao do config.toml (remover 7 linhas)
- 1 migration SQL para storage

