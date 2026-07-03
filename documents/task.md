# Roadmap de Tarefas — Mega Fama Funil de Teste Grátis

Checklist de controle de desenvolvimento e implantação.

## [Concluído]

- [x] **Etapa 1: Redesign Completo (UI/UX)**
  - [x] Alteração da paleta de cores para Azul e Branco Mega Fama.
  - [x] Integração de ícones 3D premium (sem caixas de fundo pesadas).
  - [x] Botões pulsantes estimulantes com microinterações.
  - [x] Otimização mobile: 100% visível na tela sem necessidade de rolagem.

- [x] **Etapa 2: Integração com Duke Fornecedor (PerfectPanel API)**
  - [x] Conexão automática para envio de seguidores, curtidas e views.
  - [x] Formatação de links e usernames por plataforma (Instagram, TikTok, Kwai).
  - [x] Sistema de tradução de erros de API do fornecedor para mensagens amigáveis em português.

- [x] **Etapa 3: Painel Administrativo (/administracao)**
  - [x] Login seguro com senha configurável (`ADMIN_PASSWORD`).
  - [x] Dashboard com monitoramento de saldo em tempo real no fornecedor.
  - [x] Tabela de auditoria de pedidos com botão de Reenviar (Retry) integrado.
  - [x] Configuração em tela das chaves de API, URLs e IDs de serviço SMM.
  - [x] Customização de metadados de SEO (Título do site, Favicon, Descrição) e número do WhatsApp de suporte.

- [x] **Etapa 4: Banco de Dados Relacional e Segurança de Backend**
  - [x] Implantação do SQLite local gerenciado pelo Prisma ORM (com migrations).
  - [x] Normalização rígida de arrobas e links de posts (preservando o case do Instagram).
  - [x] Geração de hashes de destino (SHA-256) e validação de elegibilidade única no servidor.
  - [x] Controle dinâmico de quantidades gratuitas por rede/serviço e pacotes pagos configuráveis.
  - [x] Proteção do login administrativo contra força bruta com tempo de espera progressivo e hash seguro.
  - [x] Rate limiting nos pedidos de testes grátis públicos por IP e sessão.
  - [x] Rastreamento e log de cliques de redirecionamento para ofertas de checkouts pagos.
  - [x] Criação de suíte de testes unitários automatizada (`run-tests.ts`) cobrindo 25 regras críticas e aprovação com 100% de sucesso.
