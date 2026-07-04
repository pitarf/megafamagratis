#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE ATUALIZAÇÃO AUTOMÁTICA E DEPLOY SEGURO (VPS HOSTINGER)
# =========================================================================
set -Eeuo pipefail

# 1. Localiza a raiz do projeto e adquire lock de execução única
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$PROJECT_ROOT"

LOCK_FILE="/tmp/megafama_update.lock"
exec 200>"$LOCK_FILE"

# Tenta travar o lock
if ! flock -n 200; then
  echo "⚠️ ALERTA: Outro processo de atualização ou deploy já está em execução."
  exit 1
fi

echo "========================================================================="
echo "🔄 Iniciando atualização do Mega Fama..."
echo "========================================================================="

# 2. Pré-requisitos e Validação do Ambiente
ENV_FILE="$PROJECT_ROOT/.env.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ ERRO: O arquivo .env.production de produção não existe em $ENV_FILE"
  exit 1
fi

# Verifica se o repositório git está limpo (sem modificações locais soltas)
if ! git diff-index --quiet HEAD --; then
  echo "❌ ERRO: O diretório Git possui modificações locais não commitadas."
  echo "Limpe ou commite as modificações antes de atualizar."
  exit 1
fi

PREVIOUS_COMMIT=$(git rev-parse --short HEAD)
echo "ℹ️ Versão atual (Commit): $PREVIOUS_COMMIT"

# 3. Pull das novas alterações do Git
echo "📥 Buscando atualizações no repositório remoto..."
git fetch
if ! git pull --ff-only origin main; then
  echo "❌ ERRO: Falha ao executar git pull --ff-only. Há conflitos ou divergências no histórico."
  exit 1
fi

NEW_COMMIT=$(git rev-parse --short HEAD)
echo "ℹ️ Nova versão (Commit): $NEW_COMMIT"

# Se não houve alterações, avisa mas prossegue para garantir integridade do deploy
if [ "$PREVIOUS_COMMIT" = "$NEW_COMMIT" ]; then
  echo "ℹ️ Repositório já está atualizado. Procedendo com deploy para garantir consistência."
fi

# 4. Validação da Configuração Docker Compose
echo "🔍 Validando arquivos do Docker Compose..."
if ! docker compose -f docker-compose.prod.yml config > /dev/null; then
  echo "❌ ERRO: Arquivo docker-compose.prod.yml contém erros de sintaxe ou configuração."
  exit 1
fi

# 5. Inicia/Garante PostgreSQL em execução para Backup
echo "🐘 Garantindo que o PostgreSQL esteja online..."
docker compose -f docker-compose.prod.yml up -d postgres

echo "⏳ Aguardando healthcheck do banco..."
DB_ATTEMPTS=0
DB_MAX_ATTEMPTS=15
until docker compose -f docker-compose.prod.yml ps postgres | grep -q "healthy" || [ $DB_ATTEMPTS -eq $DB_MAX_ATTEMPTS ]; do
  sleep 2
  DB_ATTEMPTS=$((DB_ATTEMPTS + 1))
done

if ! docker compose -f docker-compose.prod.yml ps postgres | grep -q "healthy"; then
  echo "❌ ERRO: O PostgreSQL não está saudável."
  exit 1
fi

# 6. Backup de segurança Pré-Deploy (Antes de rodar migrations)
echo "🔒 Criando backup pré-deploy de segurança..."
chmod +x "$PROJECT_ROOT/scripts/backup-db.sh"
if ! "$PROJECT_ROOT/scripts/backup-db.sh"; then
  echo "❌ ERRO: Falha crítica ao criar o backup pré-deploy. Cancelando atualização para evitar perda de dados."
  exit 1
fi

# 7. Build da Imagem Docker da Aplicação
echo "🐳 Construindo imagem Docker da aplicação..."
if ! docker compose -f docker-compose.prod.yml build app; then
  echo "❌ ERRO: Falha no build da imagem da aplicação."
  exit 1
fi

# 8. Executa as Migrations de Produção
echo "⚡ Executando migrations do banco..."
if ! docker compose -f docker-compose.prod.yml run --rm migrate; then
  echo "❌ ERRO: Falha na execução das migrations."
  exit 1
fi

# 9. Sobe a Aplicação Nova
echo "🚀 Reiniciando os containers da aplicação..."
if ! docker compose -f docker-compose.prod.yml up -d --remove-orphans; then
  echo "❌ ERRO: Falha ao subir os containers."
  exit 1
fi

# 10. Aguarda e valida Healthcheck da Aplicação
echo "⏳ Aguardando healthcheck da aplicação..."
APP_ATTEMPTS=0
APP_MAX_ATTEMPTS=20
until docker compose -f docker-compose.prod.yml ps app | grep -q "healthy" || [ $APP_ATTEMPTS -eq $APP_MAX_ATTEMPTS ]; do
  sleep 2
  APP_ATTEMPTS=$((APP_ATTEMPTS + 1))
done

if ! docker compose -f docker-compose.prod.yml ps app | grep -q "healthy"; then
  echo "❌ ERRO: A aplicação atualizada não passou no teste de integridade (healthcheck)."
  echo "=== LOGS DA APLICAÇÃO ==="
  docker compose -f docker-compose.prod.yml logs app
  exit 1
fi

echo "✅ Aplicação atualizada com sucesso!"

# 11. Limpeza segura de imagens Docker antigas
echo "🧹 Limpando imagens Docker antigas..."
docker image prune -f

# 12. Relatório de status e log de deploy
echo "📝 Gravando histórico de deploy..."
DEPLOY_LOG="$PROJECT_ROOT/logs/deploy.log"
mkdir -p "$(dirname "$DEPLOY_LOG")"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy realizado com sucesso do commit $PREVIOUS_COMMIT para $NEW_COMMIT" >> "$DEPLOY_LOG"

echo ""
echo "========================================================================="
echo "🎉 Atualização Concluída!"
echo "========================================================================="
docker compose -f docker-compose.prod.yml ps
echo "========================================================================="
exit 0
