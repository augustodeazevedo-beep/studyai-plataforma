Plano urgente de correção de segurança

Vou tratar os problemas exibidos no scanner e os achados atuais do linter em três frentes:

1. Corrigir vazamento de erros internos nas funções backend
- Substituir respostas do tipo `error: e.message` por mensagens seguras e genéricas para erros 500.
- Manter detalhes técnicos apenas nos logs internos.
- Preservar mensagens específicas apenas para casos esperados e seguros: sessão inválida, payload inválido, limite de IA, créditos insuficientes etc.
- Funções prioritárias a revisar: `process-edital`, `recalculate-review-schedule`, `run-continuous-audit`, `ai-coach`, `ai-professor`, `professor-tools`, `predict-cycle`, `generate-study-plan`, `generate-reviews`, `expand-note`, `delete-account`, `export-user-data` e `auth-email-hook`.

2. Resolver alertas de banco sobre funções SECURITY DEFINER executáveis publicamente
- Criar migração de hardening para revogar `EXECUTE` de `PUBLIC` e `anon` nas funções sensíveis.
- Repermitir execução apenas aos papéis necessários, por exemplo:
  - `authenticated` para funções que o app usa diretamente, como validação de conquistas e leitura de fila quando aplicável.
  - manter funções de sistema sem exposição pública quando usadas apenas por backend/service role.
- Confirmar que funções com `SECURITY DEFINER` continuam com `search_path` explícito, sem reintroduzir mutabilidade.

3. Validar com scanners e build/deploy
- Rodar o linter do backend novamente após a migração.
- Rodar o scanner de segurança atualizado.
- Executar build de produção.
- Implantar novamente as funções backend alteradas.
- Marcar o achado de “Raw internal errors exposed” como corrigido quando o scanner confirmar ou quando a correção estiver aplicada de forma verificável.

Observação sobre o alerta “Extension in Public”
- Esse tipo de alerta pode depender de extensão já instalada no schema público por infraestrutura existente. Vou verificar antes de alterar, porque mover extensão sem identificar dependências pode quebrar recursos do projeto. Se for seguro, incluo migração; se não for seguro, registro como pendência técnica justificada.

Resultado esperado
- As funções deixam de expor mensagens internas de banco, constraints, nomes de tabelas ou caminhos.
- Funções privilegiadas deixam de ser executáveis por usuários anônimos quando não necessário.
- O painel de segurança deve sair do estado “outdated” após nova varredura e apresentar menos alertas ou alertas justificados.