Plano de revisão/refatoração prioritária

Objetivo
- Corrigir os pontos de maior risco encontrados na auditoria read-only, reduzindo telas em branco, erros 500, falhas de permissão, risco de perda/exposição de dados e custo futuro de manutenção.

1. Corrigir bug crítico de permissão em `profiles`
- Problema identificado: as policies de `profiles` usam `is_admin(auth.uid())`, mas uma migração posterior revogou `EXECUTE` dessa função para usuários autenticados.
- Efeito atual: chamadas simples como `profiles.select("onboarding_completed")` podem retornar `403 permission denied for function is_admin`, quebrando onboarding/dashboard.
- Correção proposta:
  - Ajustar as policies de `profiles` para o caso comum usar apenas `auth.uid() = user_id`.
  - Criar policies administrativas separadas somente se necessário, sem quebrar o fluxo do usuário comum.
  - Revisar também `user_roles`, porque suas policies chamam `is_admin` e podem sofrer do mesmo problema.

2. Padronizar cliente backend nas funções de IA
- Problema identificado: várias funções usam `Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!`, mas o erro recente mostrou que esse nome pode não estar disponível em runtime de função, gerando 500.
- Funções afetadas prioritárias:
  - `ai-coach`
  - `ai-professor`
  - `expand-note`
  - `professor-tools`
  - `generate-study-plan`
  - `generate-reviews`
  - `run-continuous-audit`
  - `recalculate-review-schedule`
- Correção proposta:
  - Criar/replicar helper seguro em cada função: usar `SUPABASE_ANON_KEY` com fallback para `SUPABASE_PUBLISHABLE_KEY`.
  - Retornar erro claro quando configuração interna estiver ausente, em vez de `throw` genérico.
  - Manter CORS em todas as respostas.

3. Validar inputs e tratar respostas de IA de forma consistente
- Problema identificado: algumas funções ainda aceitam payloads com validação mínima e retornam 500 para erros esperados.
- Correção proposta:
  - Adicionar validação de campos obrigatórios, tipos, limites de tamanho e enums nas funções chamadas pelo cliente.
  - Converter erros do usuário para `400`, autenticação para `401`, rate limit para `429`, créditos para `402`, e só deixar `500` para falha interna real.
  - Padronizar mensagens amigáveis para o usuário e logs técnicos apenas no backend.

4. Resolver risco de storage apontado pela varredura de segurança
- Problema identificado: o bucket `study-materials` tem policies duplicadas/mais amplas para `{public}` em SELECT/INSERT/DELETE, além das policies autenticadas.
- Risco: possível acesso anônimo indevido se o padrão de pasta for adivinhado.
- Correção proposta:
  - Remover policies públicas duplicadas do storage.
  - Manter somente policies autenticadas, garantindo que cada usuário acesse apenas seus próprios arquivos.
  - Validar fluxo de upload/processamento de PDF após a alteração.

5. Melhorar tolerância a falhas no dashboard
- Problema identificado: `Dashboard.tsx` não trata erro na leitura de `profiles`; quando há 403, fica vulnerável a loading infinito/tela em branco.
- Correção proposta:
  - Tratar `error` explicitamente em `checkOnboarding`.
  - Em erro recuperável, liberar loading e mostrar toast/estado amigável em vez de travar a tela.
  - Evitar chamadas duplicadas de onboarding quando `onAuthStateChange` e `getSession` disparam em sequência.

6. Corrigir warnings de `ref` em componentes do dashboard
- Problema observado nos logs: `Function components cannot be given refs` em `Dashboard`, `NotebooksTab` e `PredictorTab`.
- Correção proposta:
  - Identificar o wrapper/componente que injeta `ref` nos filhos do dashboard.
  - Ajustar para não clonar/injetar refs em function components, ou envolver abas com elemento DOM estável.
  - Corrigir uso incorreto de `Select` em `NotebooksTab`, se confirmado.

7. Verificação final
- Rodar build/typecheck.
- Executar testes existentes.
- Redeploy das funções alteradas.
- Rodar linter/scan do backend novamente.
- Validar manualmente os fluxos críticos:
  - login/dashboard/onboarding;
  - Previsor.IA;
  - Coach.IA;
  - Professor.IA;
  - expansão de notas;
  - upload/processamento de edital;
  - acesso a materiais no storage.

Ordem de implementação recomendada
1. Policies de `profiles`/`user_roles` e storage, pois afetam acesso e segurança.
2. Helpers/configuração das funções de IA, pois reduzem 500 recorrente.
3. Validações e tratamento de erro nas funções.
4. Resiliência do dashboard.
5. Warnings de ref/UI.
6. Testes, build e redeploy.

Detalhes técnicos
- Não editar arquivos gerados: `src/integrations/supabase/client.ts` e `src/integrations/supabase/types.ts`.
- Todas as mudanças de banco/storage serão feitas via migrações seguras.
- Nenhuma migração destrutiva de dados de negócio será feita sem inspeção prévia.
- Funções de IA continuarão usando Lovable AI via backend, nunca diretamente pelo cliente.
- Logs persistentes serão mantidos sem registrar conteúdo sensível integral.