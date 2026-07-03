# Changelog — Mega Fama Funil de Teste Grátis

Histórico de versões e melhorias implementadas no sistema.

---

### [1.3.1] - 2026-07-03
### Melhorias
- **Autenticação Admin:** Isolamento de imports do Node nativo (crypto), eliminando o erro de bloqueio/renderização no Client Side.
- **Preparação VPS (Hostinger):** Script de importação automática do banco (`init_database_megafama.sql`) mapeado no PostgreSQL via Docker Compose, além de mitigação de conflito de portas (Padrão: 3050).

### [1.3.0] - 2026-07-03
### Adicionado
- **Persistência Relacional com Prisma & SQLite:**
  - Migração do armazenamento de JSON local para banco de dados relacional SQLite local com suporte nativo a migrações de versionamento (`npx prisma migrate`).
  - Suporte total para futuras migrações para PostgreSQL ou Cloudflare D1.
- **Segurança de Backend e Destino Único:**
  - Validação de unicidade atômica no servidor usando transações do banco e hashes SHA-256 baseados em inputs higienizados de perfis ou links.
  - Normalizador avançado de URLs e arrobas (tratando case-sensitive de IDs do Instagram, queries de rastreamento e hosts).
  - Rate limiting ativo por IP/sessão para impedir abuso de bots e inundações.
  - Proteção contra força bruta (brute force) no login administrativo com backoff progressivo por IP.
- **Gerenciamento de Quantidades e Ofertas:**
  - CRUD dinâmico completo de quantidades grátis ativas no painel admin, exibindo um seletor visual na interface caso haja múltiplas opções ativas.
  - CRUD dinâmico completo de pacotes de ofertas pagas exibidos dinamicamente na interface.
  - Logs de redirecionamento (impressões/cliques) para rastreamento de conversão.
- **Suíte de Testes Automatizados:**
  - Criação de `src/tests/run-tests.ts` para validar 25 regras críticas de segurança no servidor de forma programática.

---

## [1.2.0] - 2026-07-03
### Adicionado
- **Painel Administrativo (`/administracao`):**
  - Autenticação restrita via senha mestra (`ADMIN_PASSWORD`).
  - Monitoramento de carteira administrativa (saldo Duke Fornecedor) em tempo real via API.
  - Métricas chave (KPIs) de cliques e conversões de teste.
  - Tabela de pedidos com filtros de busca, status detalhado de envio (SMM ID) e erros amigáveis.
  - Ação de **Reenviar (Retry)** para ordens com falha de entrega SMM.
  - Aba de configurações gerais de SEO (Título, Meta Descrição, Favicon) e telefone WhatsApp de suporte.
  - Aba de gerenciamento de IDs de serviço Duke.
- **Dynamic SEO:**
  - Carregamento assíncrono e SSR de metadados baseado nas configurações salvas do painel administrativo.

### Corrigido
- Resolução de caminhos do servidor usando `path.resolve` para evitar erros de compilação em avaliações do módulo no lado do cliente.
- Ofuscação de importações do `vinxi/http` usando `eval` para impedir travamento do bundler de cliente (Rolldown).

---

## [1.1.0] - 2026-07-03
### Adicionado
- **Integração Duke Fornecedor (PerfectPanel API):**
  - Lógica no servidor (`src/services/smm-server.ts`) para despachar pedidos automaticamente de seguidores, curtidas e views para Instagram, TikTok e Kwai.
  - Tratamento inteligente de erros e traduções em português brasileiro para falhas na API.
  - Mapeamento dinâmico de links e usernames.

---

## [1.0.0] - 2026-07-02
### Adicionado
- **Novo Design Visual e UX Premium:**
  - Reformulação completa seguindo a paleta da Mega Fama (Azul e Branco com HSL).
  - Ícones 3D em alta resolução flutuantes e botões pulsantes que elevam a dopamina do usuário.
  - Layout compactado com 0% de rolagem (sem scroll) no mobile.
  - Fluxo em 5 etapas intuitivo com progressão de porcentagem.
  - Redirecionamento de pacotes (100X, 500X, 1000X) para checkout oficial.
