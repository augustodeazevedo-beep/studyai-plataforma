## Plano de implementação

Vou reforçar todo o fluxo de PDF do Arsenal para que falhas sejam explicadas ao usuário, arquivos inválidos sejam bloqueados cedo e exista fallback seguro no backend quando o navegador não conseguir extrair o texto.

### 1. Tela/estado de falha do processamento de PDF
- Adicionar um painel visível na área “Upload PDF” quando ocorrer falha.
- Mostrar:
  - motivo claro e não sensível, por exemplo: arquivo corrompido, PDF escaneado/sem texto, navegador incompatível, limite de tamanho, tipo inválido ou falha temporária no backend;
  - ID da submissão para suporte/debug;
  - etapa em que falhou: validação, upload, extração no navegador, fallback backend ou IA;
  - botão “Tentar novamente” mantendo o arquivo selecionado quando for seguro;
  - opção “Usar Colar Texto” quando o PDF não possuir texto extraível.
- Manter mensagens internas e stack traces fora da interface.

### 2. Validações antes do leitor de PDF
- Criar validação mais forte no cliente antes de chamar o pdf.js:
  - tamanho maior que zero e limite de 20MB;
  - extensão `.pdf`;
  - MIME declarado aceito apenas como PDF;
  - leitura da assinatura `%PDF-`;
  - checagem básica de estrutura no fim do arquivo, procurando marcador `%%EOF` em uma janela final;
  - bloqueio de arquivos suspeitos/corrompidos antes do leitor.
- Normalizar erros em categorias seguras para UX e logs.

### 3. Fallback backend quando o navegador falhar
- Ajustar o fluxo para tentar nesta ordem:

```text
Selecionar PDF
  -> validar localmente
  -> tentar extrair no navegador
  -> se falhar por incompatibilidade/worker/pdf.js: enviar para storage privado
  -> chamar função backend para validar ownership e extrair texto
  -> chamar processamento IA com o texto extraído
```

- Criar uma função backend específica para extração/fallback, por exemplo `extract-pdf-text`, com:
  - autenticação por JWT validada em código;
  - validação de payload com Zod;
  - checagem de ownership pelo caminho do arquivo (`userId/submissionId.pdf`) e pelo usuário autenticado;
  - download do arquivo privado apenas após confirmar ownership;
  - validação server-side de assinatura PDF/tamanho;
  - extração de texto usando biblioteca compatível com Deno/Node modules, se viável no ambiente;
  - retorno apenas do texto extraído ou de erro seguro.
- Caso o backend também não consiga extrair texto, informar ao usuário que o PDF provavelmente é escaneado/imagem ou está protegido/corrompido e orientar o uso de “Colar Texto”.

### 4. Logs e rastreio com correlação
- Adicionar uma tabela de logs/auditoria de processamento de PDF, por exemplo `pdf_processing_logs`, com RLS para o próprio usuário visualizar seus logs e sem dados sensíveis.
- Registrar eventos por `submissionId` e `user_id`:
  - `selected`, `validation_started`, `validation_failed`, `browser_extraction_started`, `browser_extraction_failed`, `storage_upload_started`, `storage_upload_completed`, `backend_extraction_started`, `backend_extraction_failed`, `ai_processing_started`, `completed`.
- Metadados seguros:
  - nome truncado do arquivo;
  - tamanho;
  - MIME declarado;
  - MIME detectado/assinatura;
  - hash SHA-256 do arquivo;
  - worker escolhido (`pdfjs legacy browser`, `backend fallback`);
  - número de páginas/texto extraído quando disponível;
  - códigos de erro normalizados, sem stack trace, sem conteúdo integral do PDF.
- Incluir logs também no console do backend com `submissionId`, mas sem conteúdo do edital.

### 5. Storage: impedir sobrescrita e validar ownership
- Manter o bucket `study-materials` privado.
- Reforçar o upload para usar caminhos únicos:

```text
{userId}/edital-submissions/{submissionId}.pdf
```

- No cliente, fazer upload com `upsert: false` para bloquear sobrescrita acidental.
- Revisar as policies de `storage.objects`:
  - INSERT/SELECT/DELETE/UPDATE restritos ao primeiro segmento do path igual ao `auth.uid()`;
  - UPDATE com `WITH CHECK` preservando ownership.
- No backend, antes de processar o arquivo, validar:
  - bucket é `study-materials`;
  - path começa com o `user.id` autenticado;
  - arquivo existe e metadata/tamanho são compatíveis;
  - o `submissionId` recebido corresponde ao path esperado.

### 6. Integração com o processamento existente
- Reaproveitar a função `process-edital` para IA e criação de disciplinas/tópicos; ela continuará recebendo `editalText` validado.
- O fallback backend ficará responsável apenas por extrair texto do PDF e retornar erro seguro quando não for possível.
- Preservar a opção “Colar Texto” como caminho alternativo rápido.

### 7. Validação final
- Rodar build TypeScript/Vite.
- Testar os cenários principais:
  - PDF válido com texto extraído no navegador;
  - PDF inválido por extensão/tamanho/assinatura;
  - PDF corrompido sem `%%EOF`;
  - falha simulada do navegador acionando fallback backend;
  - PDF escaneado sem texto suficiente;
  - tentativa de sobrescrever path existente bloqueada;
  - tentativa de processar path fora do usuário bloqueada.

## Arquivos/áreas previstos
- `src/components/dashboard/ArsenalTab.tsx`: UX de erro, validações, retry, upload seguro, logging e fallback.
- `supabase/functions/extract-pdf-text/index.ts`: fallback backend seguro.
- `supabase/migrations/...sql`: tabela de logs e ajustes/policies de storage se necessário.
- Possivelmente `supabase/config.toml`: apenas se a nova função exigir configuração específica não padrão.

## Resultado esperado
O usuário passa a ver o motivo real e acionável da falha, consegue tentar novamente, o app tenta continuar pelo backend quando o navegador falha, e futuros erros ficam rastreáveis por usuário/submissão sem expor dados sensíveis.