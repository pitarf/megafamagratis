#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE PRIMEIRA INSTALAÇÃO E BOOTSTRAP (VPS UBUNTU HOSTINGER)
# =========================================================================
set -Eeuo pipefail

echo "========================================================================="
echo "🚀 Iniciando Instalação e Bootstrap do Funil Mega Fama"
echo "========================================================================="

# 1. Verifica privilégios de root
if [ "$EUID" -ne 0 ]; then
  echo "❌ ERRO: Este script precisa ser executado como root ou via sudo."
  exit 1
fi

# 2. Cria estrutura de pastas fora do repositório da aplicação
echo "📁 Criando diretórios persistentes de dados e logs..."
mkdir -p /opt/megafama/app
mkdir -p /opt/megafama/data/postgres
mkdir -p /opt/megafama/backups/postgres
mkdir -p /opt/megafama/logs

# Ajusta permissões básicas
chmod -R 755 /opt/megafama
chmod 700 /opt/megafama/data/postgres
chmod 700 /opt/megafama/backups/postgres

# 3. Verifica ou instala Docker e Docker Compose
if ! command -v docker &> /dev/null; then
  echo "🐳 Docker não localizado. Instalando Docker Engine..."
  apt-get update
  apt-get install -y apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release
  
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  echo "✅ Docker instalado com sucesso."
else
  echo "✅ Docker já está instalado."
fi

# 4. Configura o arquivo de produção (.env.production)
ENV_PROD="/opt/megafama/app/.env.production"
ENV_EXAMPLE="/opt/megafama/app/.env.example"

if [ ! -f "$ENV_PROD" ]; then
  echo "📝 Criando arquivo .env.production a partir do .env.example..."
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_PROD"
    chmod 600 "$ENV_PROD"
    echo "🚨 ATENÇÃO: O arquivo .env.production foi criado. Edite-o agora em /opt/megafama/app/.env.production para definir senhas fortes antes de prosseguir!"
    exit 0
  else
    echo "❌ ERRO: .env.example não localizado na pasta /opt/megafama/app."
    exit 1
  fi
fi

# 5. Validação contra senhas default/placeholders
if grep -q "insira_uma_senha_forte" "$ENV_PROD"; then
  echo "❌ ERRO DE CONFIGURAÇÃO: Detectamos senhas padrão/placeholders no arquivo .env.production."
  echo "Abra o arquivo /opt/megafama/app/.env.production e altere POSTGRES_PASSWORD, DATABASE_URL e ADMIN_INITIAL_PASSWORD com credenciais reais e seguras."
  exit 1
fi

# 6. Inicia o PostgreSQL e aguarda o Healthcheck
echo "🐘 Iniciando o container de banco de dados PostgreSQL..."
cd /opt/megafama/app
docker compose -f docker-compose.prod.yml up -d postgres

echo "⏳ Aguardando o PostgreSQL ficar pronto e saudável..."
ATTEMPTS=0
MAX_ATTEMPTS=20
until docker compose -f docker-compose.prod.yml ps | grep -q "healthy" || [ $ATTEMPTS -eq $MAX_ATTEMPTS ]; do
  sleep 2
  ATTEMPTS=$((ATTEMPTS + 1))
done

if ! docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
  echo "❌ ERRO: O PostgreSQL não ficou pronto no tempo limite de 40 segundos."
  docker compose -f docker-compose.prod.yml logs postgres
  exit 1
fi
echo "✅ PostgreSQL online e saudável."

# 7. Executa as Migrations e cria o Admin Inicial
echo "⚡ Executando as migrations do Prisma no banco de dados relacional..."
if ! docker compose -f docker-compose.prod.yml run --rm migrate; then
  echo "❌ ERRO: Falha ao rodar migrations ou seeding inicial."
  exit 1
fi
echo "✅ Migrations aplicadas e banco semeado."

# 8. Inicia a aplicação principal
echo "🚀 Iniciando o container da aplicação principal (megafama_app)..."
docker compose -f docker-compose.prod.yml up -d app

echo "⏳ Aguardando healthcheck da aplicação..."
APP_ATTEMPTS=0
APP_MAX_ATTEMPTS=15
until docker compose -f docker-compose.prod.yml ps app | grep -q "healthy" || [ $APP_ATTEMPTS -eq $APP_MAX_ATTEMPTS ]; do
  sleep 2
  APP_ATTEMPTS=$((APP_ATTEMPTS + 1))
done

if ! docker compose -f docker-compose.prod.yml ps app | grep -q "healthy"; then
  echo "❌ ERRO: A aplicação não passou no teste de integridade (healthcheck)."
  echo "=== LOGS DA APLICAÇÃO ==="
  docker compose -f docker-compose.prod.yml logs app
  exit 1
fi
echo "✅ Aplicação iniciada e saudável!"

# 9. Configura backup automático e roda a primeira cópia
echo "⏰ Configurando backup diário..."
chmod +x /opt/megafama/app/scripts/*.sh
/opt/megafama/app/scripts/setup-backup-schedule.sh

echo "📦 Executando o primeiro backup de validação da infraestrutura..."
/opt/megafama/app/scripts/backup-db.sh

# 10. Status Final
echo ""
echo "========================================================================="
echo "🎉 Instalação Concluída com Sucesso!"
echo "========================================================================="
docker compose -f docker-compose.prod.yml ps
echo "========================================================================="
exit 0
