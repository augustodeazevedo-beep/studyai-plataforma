

# Plano de Melhorias de Segurança e Persistência - COGNOS

## Diagnóstico Atual

O scan de segurança revelou 3 vulnerabilidades, e a análise do código identificou funcionalidades ausentes importantes:

1. **RLS com role `{public}` em 12+ tabelas** -- deveria ser `{authenticated}`
2. **Leaked password protection desativada**
3. **Achievements sem validação server-side** (usuários podem auto-atribuir conquistas)
4. **Sem fluxo de recuperação de senha** (nem "esqueci minha senha", nem página `/reset-password`)
5. **Sem funcionalidade de exclusão de conta** (exigência LGPD)
6. **Sem exportação de dados do usuário** (exigência LGPD)

---

## Etapas de Implementação (em ordem de prioridade)

### Etapa 1 -- Corrigir RLS Policies (migração SQL)

Atualizar todas as tabelas que usam `FOR ... TO public` para `TO authenticated`. Tabelas afetadas: `reminders`, `topics`, `study_materials`, `study_calendar_blocks`, `user_subjects`, `study_sessions`, `ai_coaching_history`, `spaced_reviews`, `flashcards`, `user_notes`, `user_roles`, `study_plan`, `user_achievements`, `question_attempts`, `questions`, `profiles`.

Para cada tabela: `DROP POLICY` existente e `CREATE POLICY` idêntica mas com `TO authenticated`.

### Etapa 2 -- Habilitar Leaked Password Protection

Usar a ferramenta de configuração de autenticação para ativar a proteção contra senhas vazadas.

### Etapa 3 -- Validação Server-side de Achievements

Criar uma função `SECURITY DEFINER` que valida conquistas antes de inserir, e alterar a policy de INSERT em `user_achievements` para usar essa função ou restringir inserções diretas.

### Etapa 4 -- Fluxo de Recuperação de Senha

- Adicionar link "Esqueci minha senha" na tela de login (`Auth.tsx`)
- Criar componente de formulário que chama `supabase.auth.resetPasswordForEmail()`
- Criar página `/reset-password` que captura o token de recovery e permite definir nova senha via `supabase.auth.updateUser()`
- Adicionar rota `/reset-password` no `App.tsx`

### Etapa 5 -- Exclusão de Conta (LGPD)

- Criar edge function `delete-account` que:
  - Valida autenticação do usuário
  - Deleta todos os dados do usuário (as foreign keys com CASCADE já cuidam da maioria)
  - Usa `supabase.auth.admin.deleteUser()` para remover da tabela auth
- Adicionar botão "Excluir minha conta" no `SettingsTab.tsx` com confirmação dupla (AlertDialog + digitar "EXCLUIR")

### Etapa 6 -- Exportação de Dados (LGPD)

- Criar edge function `export-user-data` que:
  - Coleta dados de todas as tabelas do usuário (profiles, subjects, sessions, notes, flashcards, etc.)
  - Retorna JSON estruturado
- Adicionar botão "Exportar meus dados" no `SettingsTab.tsx` que baixa o arquivo JSON

---

## Arquivos que serão criados/editados

| Arquivo | Ação |
|---|---|
| Migração SQL | Recriar ~30 RLS policies com `TO authenticated` |
| `supabase/functions/delete-account/index.ts` | Criar |
| `supabase/functions/export-user-data/index.ts` | Criar |
| `src/pages/ResetPassword.tsx` | Criar |
| `src/pages/Auth.tsx` | Adicionar "esqueci minha senha" |
| `src/App.tsx` | Adicionar rota `/reset-password` |
| `src/components/dashboard/SettingsTab.tsx` | Adicionar botões de exclusão e exportação |
| `supabase/config.toml` | Registrar novas edge functions |

