# Guia de Implantação e Operação (VPS Hostinger / Ubuntu)

Este manual detalha a infraestrutura Docker de produção, procedimentos de backup, restauração, deploy inicial e atualizações automáticas para o funil Mega Fama.

---

## 🛠️ 1. Requisitos da VPS
- **Sistema Operacional:** Ubuntu 20.04 ou 22.04 LTS (limpo).
- **Recursos Mínimos:** 1 vCPU, 2GB de RAM (recomendado 4GB para builds do Docker rápidos).
- **Dependências:** Apenas acesso root/sudo (o Docker e o Docker Compose serão instalados automaticamente pelo script `setup-vps.sh`).

---

## 📁 2. Estrutura de Diretórios na VPS

Os dados persistentes de produção ficam isolados fora da pasta da aplicação para garantir que git pulls ou builds não apaguem dados do banco:

```bash
/opt/megafama/
├── app/               # Repositório da aplicação (código fonte e docker-compose.prod.yml)
├── data/
│   └── postgres/      # Arquivos de dados do PostgreSQL (Volume Persistente)
├── backups/
│   └── postgres/      # Arquivos .dump de backup diário (Retenção de 7 dias)
└── logs/
    ├── deploy.log     # Histórico de deploys executados pelo update.sh
    └── backup.log     # Histórico de execuções do cron (se ativo)
```

---

## 🔑 3. Configuração do `.env.production`

Ao clonar o projeto na VPS em `/opt/megafama/app`, configure as credenciais copiando o `.env.example` para `.env.production` com permissões restritas:

```bash
cd /opt/megafama/app
cp .env.example .env.production
chmod 600 .env.production
nano .env.production
```

Defina as variáveis obrigatórias:
- `POSTGRES_PASSWORD`: Senha forte aleatória do PostgreSQL.
- `DATABASE_URL`: Substitua a senha forte nela (ex: `postgresql://megafama_app:<sua-senha-forte>@postgres:5432/megafama?schema=public`). 
  *Nota: Se a senha contiver caracteres especiais como `@`, converta para hexadecimal (ex: `@` vira `%40`).*
- `ADMIN_EMAIL`: Email do primeiro administrador.
- `ADMIN_INITIAL_PASSWORD`: Senha forte inicial do administrador.
  *Recomendação: Remova ou comente essa senha após o primeiro login.*

---

## 🚀 4. Primeiro Deploy (Instalação Inicial)

Execute o script de setup para configurar dependências do Docker, criar pastas, inicializar o banco, aplicar migrations, semear dados iniciais e programar backups:

```bash
sudo ./setup-vps.sh
```

---

## 🔄 5. Atualização do Sistema (`update.sh`)

Sempre que enviar novas alterações para a branch `main` do Git, entre na VPS e execute o script de atualização segura na raiz:

```bash
sudo ./update.sh
```

O script realizará as seguintes etapas automaticamente:
1. Adquirirá um lock exclusivo de deploy para evitar colisões.
2. Verificará se há alterações locais não salvas no Git (bloqueia o deploy se o Git estiver sujo).
3. Executará `git pull --ff-only`.
4. Garantirá que o PostgreSQL esteja saudável.
5. Criará um **backup de segurança pré-deploy** e o validará.
6. Construirá a nova imagem Docker.
7. Aplicará as migrations de banco relacional do Prisma (`prisma migrate deploy`).
8. Subirá a aplicação nova e testará o `/api/health`. Em caso de erro, reverte e exibe logs.
9. Limpará imagens Docker antigas não utilizadas.

---

## 📦 6. Backup do Banco de Dados

### Backup Automático
O backup é executado diariamente às **03:00** (horário America/Sao_Paulo).
- Verifique o status do timer do systemd:
  ```bash
  systemctl status megafama-backup.timer
  ```
- Para ver logs das execuções do backup:
  ```bash
  journalctl -u megafama-backup.service -n 50
  ```

### Backup Manual
Para disparar um backup completo de forma manual:
```bash
sudo /opt/megafama/app/scripts/backup-db.sh
```

### Listagem dos Backups
Os backups são gravados em formato custom binário do Postgres (.dump) e mantêm retenção estrita dos últimos 7 arquivos:
```bash
ls -lh /opt/megafama/backups/postgres/
```

---

## ⏪ 7. Restauração do Banco de Dados (`restore-db.sh`)

Para restaurar um backup existente:
1. Obtenha o caminho do arquivo (ex: `/opt/megafama/backups/postgres/megafama_2026-07-03_030000.dump`).
2. Execute o script exigindo confirmação explícita:
   ```bash
   sudo ./scripts/restore-db.sh /opt/megafama/backups/postgres/megafama_2026-07-03_030000.dump
   ```

*Nota: O script criará automaticamente um backup de segurança em `/tmp/` antes de reescrever os dados.*

---

## 🔍 8. Monitoramento & logs

### Status dos Containers
```bash
docker compose -f docker-compose.prod.yml ps
```

### Logs em Tempo Real (Aplicação)
```bash
docker compose -f docker-compose.prod.yml logs -f app
```

### Logs em Tempo Real (PostgreSQL)
```bash
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Reinicializar Containers
```bash
docker compose -f docker-compose.prod.yml restart
```

---

## 🔒 9. Tarefas Administrativas e de Segurança

### Como Alterar a Senha Administrativa
As credenciais do painel administrativo ficam no banco relacional. Caso precise alterar a senha do email `admin@megafama.com` via terminal:
1. Acesse o terminal do container do banco:
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U megafama_app -d megafama
   ```
2. Caso prefira atualizar o hash bcrypt gerado (use um gerador de BCrypt localmente):
   ```sql
   UPDATE "AdminUser" SET "passwordHash" = '<novo-hash-bcrypt>' WHERE "email" = 'admin@megafama.com';
   ```

### Como Alterar a Senha do PostgreSQL
1. Pare a aplicação:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```
2. Edite `POSTGRES_PASSWORD` e `DATABASE_URL` no `.env.production` com a nova senha.
3. Suba os containers novamente:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

### Verificar Espaço em Disco
Tome cuidado para a VPS não ficar sem espaço em disco devido ao acúmulo de logs ou backups:
```bash
df -h
```

---

## ⚠️ 10. Resolução de Problemas (Contingência)

### Falha no Healthcheck do Deploy
Se o `update.sh` falhar avisando que a aplicação não está saudável:
1. Verifique os logs de inicialização da porta 3000:
   ```bash
   docker compose -f docker-compose.prod.yml logs app
   ```
2. Verifique se o banco de dados está recebendo conexões:
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres pg_isready -U megafama_app -d megafama
   ```

### Falha de Migrations Pendentes
Se houver erro no container `migrate` devido a um lock de migração pendente do Prisma:
1. Libere o lock de migração no banco de dados limpando a tabela `_prisma_migrations` se necessário (apenas em caso de migrações corrompidas de desenvolvimento):
   ```bash
   docker compose -f docker-compose.prod.yml exec postgres psql -U megafama_app -d megafama -c "DELETE FROM \"_prisma_migrations\" WHERE status = 'failed';"
   ```
2. Execute a sincronização manual:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate
   ```
