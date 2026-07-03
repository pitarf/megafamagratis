# Manual de Desenvolvimento — Funil de Teste Grátis Mega Fama

Guia de arquitetura, execução e manutenção técnica do projeto.

---

## 🛠️ Stack Tecnológica
- **Framework:** TanStack Start (React, Vite, Vinxi, Nitro).
- **Estilização:** Tailwind CSS.
- **Ícones:** Lucide React.
- **Notificações:** Sonner (Toast notifications).
- **Persistência de Dados:** SQLite local (`prisma/dev.db`) gerenciado via **Prisma ORM** para garantir transações atômicas e migrações estruturadas. Fácil suporte para PostgreSQL ou Cloudflare D1.

---

## 📁 Estrutura de Pastas e Componentes
- `src/routes/index.tsx`: Fluxo principal do funil (5 etapas). Totalmente mobile-first e otimizado para viewport sem rolagem.
- `src/routes/administracao.tsx`: Interface do Painel Administrativo com controle de KPIs, Pedidos, Quantidades Grátis e Ofertas Pagas.
- `src/services/admin-server.ts`: Server functions para autenticação do admin, reenvio de ordens e CRUD de configurações salvando diretamente no banco de dados.
- `src/services/smm-server.ts`: Server function de despacho do teste público para o fornecedor SMM Duke com validações rígidas.
- `src/services/normalizer.ts`: Helper de normalização de usernames e links determinísticos com hashes SHA-256 para evitar duplicidade de teste.
- `src/services/rate-limiter.ts`: Limitação de requisições baseada em IP e bloqueio de brute force no login administrativo.
- `prisma/schema.prisma`: Modelagem relacional do banco de dados (Settings, Quantities, Packages, Orders, Rate Limits).

---

## ⚙️ Variáveis de Ambiente (`.env`)
- `ADMIN_PASSWORD`: Senha de login no painel `/administracao` (Aviso: valores padrão ou "admin123" são proibidos e bloqueados em ambientes de produção).
- Outras chaves de fallbacks (`SMM_API_URL`, `SMM_API_KEY` e Service IDs) podem ser adicionadas no banco via painel do administrador em tela.

---

## 🚀 Execução em Desenvolvimento e Produção

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Rodar Migrações e Gerar o Prisma Client:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Iniciar servidor local de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Executar a Suíte de Testes Críticos de Backend:**
   ```bash
   npx tsx src/tests/run-tests.ts
   ```

5. **Gerar build de produção:**
   ```bash
   npm run build
   ```
