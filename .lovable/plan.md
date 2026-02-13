

# COGNOS Study.AI — Plataforma de Estudos para Concursos

## Identidade Visual
- Nome: **COGNOS Study.AI**
- Logo conforme fornecido (ícone cerebral + tipografia)
- Tema escuro imersivo com acentos em azul/ciano

---

## 1. Autenticação e Perfil do Usuário
- Login por **email/senha** e **Google OAuth**
- Perfil com dados pessoais, foto, objetivo (concurso-alvo), cargo pretendido
- Configurações: horas diárias disponíveis, dias da semana, data da prova
- Dados protegidos com RLS (Row Level Security) conforme LGPD

## 2. Onboarding Inteligente
- Wizard inicial para o usuário configurar:
  - Concurso-alvo e banca organizadora
  - Data prevista da prova
  - Disciplinas e temas do edital
  - Horas e dias disponíveis para estudo
  - Autoavaliação inicial de conhecimento por disciplina (nível 1-5)
- A IA gera o primeiro plano de estudos com base nesses dados

## 3. Motor de Planejamento com os 5 Vetores
A IA calcula a prioridade de cada tema usando:
1. **Relevância** — peso/nota do tema para o concurso
2. **Incidência** — frequência do tema em provas anteriores da banca
3. **Acurácia** — nível de conhecimento atual do aluno
4. **Desempenho** — resultados em questões e leitura de materiais
5. **Lacuna (Gap)** — risco de esquecimento baseado na curva do esquecimento (Ebbinghaus)

O plano é **híbrido**: a IA sugere cronogramas e prioridades, mas o usuário pode ajustar manualmente disciplinas, horários e intensidade.

## 4. Curva do Esquecimento e Revisões
- Sistema de revisão espaçada automática (Spaced Repetition)
- Intervalos calculados: 1 dia → 3 dias → 7 dias → 15 dias → 30 dias
- Ajuste dinâmico baseado no desempenho do aluno em cada revisão
- Alertas gentis de revisão pendente (sem pressão tipo Duolingo)

## 5. Dashboard Principal
- **Visão geral**: progresso geral, próximas sessões, revisões pendentes
- **Gráficos**: evolução por disciplina, desempenho em questões, horas estudadas
- **Indicador de confiança**: baseado nos 5 vetores, mostra "prontidão" para a prova
- **Cronômetro de estudo**: para registrar tempo real dedicado

## 6. Gestão de Materiais de Estudo
- Upload e organização de PDFs, resumos, apostilas
- Criação de flashcards vinculados a temas
- Anotações por disciplina/tema
- Materiais vinculados ao plano de revisão

## 7. Simulados e Questões
- Banco de questões por disciplina/tema
- Simulados cronometrados
- Correção automática com estatísticas
- Resultados alimentam os vetores de Acurácia e Desempenho
- Histórico completo de tentativas

## 8. Comunicação Motivacional (Estilo "Fila")
- Tom de comunicação empático e acolhedor
- Sem punições ou cobranças agressivas
- Mensagens motivacionais: "Você está na fila, sua vez vai chegar. Só não desista."
- Celebração de pequenas conquistas e streaks positivos
- Notificações opcionais e não-invasivas

## 9. Reconfiguração Dinâmica
- O plano se adapta quando o usuário:
  - Muda disponibilidade de horários
  - Adiciona/remove disciplinas
  - Muda data da prova
  - Tem desempenho diferente do esperado
- Recálculo automático de prioridades e cronograma

## 10. Modelo Freemium
- **Plano Gratuito**: 1 concurso, dashboard básico, limite de questões/dia
- **Plano Premium**: concursos ilimitados, IA completa, simulados avançados, flashcards ilimitados, relatórios detalhados
- Gestão de assinatura via Stripe

## 11. Painel Administrativo
- Gestão de usuários e assinaturas
- Métricas de uso da plataforma
- Gerenciamento de banco de questões
- Configuração de concursos e editais disponíveis

## Arquitetura Técnica
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — autenticação, banco de dados, storage, edge functions
- **IA**: Lovable AI Gateway (Gemini) para geração e ajuste de planos
- **Pagamentos**: Stripe (freemium + assinatura)
- **Segurança**: RLS em todas as tabelas, conformidade LGPD, dados criptografados

