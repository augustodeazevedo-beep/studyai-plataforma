Plano para corrigir os dois achados de segurança:

1. Corrigir funções com `search_path` mutável
   - Criar uma nova migração para recriar as funções RPC de fila de e-mail com `SET search_path TO 'public', 'pgmq'`:
     - `public.enqueue_email(queue_name text, payload jsonb)`
     - `public.read_email_batch(queue_name text, batch_size int, vt int)`
     - `public.delete_email(queue_name text, message_id bigint)`
     - `public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)`
   - Manter `SECURITY DEFINER` e as permissões restritas a `service_role`, preservando o comportamento atual.
   - Não alterar dados de usuários.

2. Corrigir extensão instalada no schema público
   - Criar uma migração para mover/reinstalar `pg_net` no schema `extensions`, removendo a instalação residual no schema `public`.
   - Garantir que o schema `extensions` exista antes de recriar a extensão.
   - Como o projeto já possui migração anterior tentando fazer isso, a nova migração será idempotente para corrigir o estado atual do banco.

3. Validação
   - Rodar novamente o linter do backend após a migração.
   - Confirmar que não restam avisos `Function Search Path Mutable` nem `Extension in Public` relacionados a esses itens.

Detalhes técnicos:
- A correção de `search_path` evita que funções privilegiadas resolvam objetos em schemas inesperados.
- A correção de `pg_net` remove uma extensão do schema `public`, reduzindo superfície de ataque e alinhando com a recomendação do linter.
- Não há operação destrutiva em tabelas de dados do usuário.