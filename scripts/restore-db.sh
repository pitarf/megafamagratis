#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE RESTAURAÇÃO DO BANCO DE DADOS (DOCKER / VPS HOSTINGER)
# =========================================================================
set -Eeuo pipefail

# 1. Configurações de Diretórios
APP_DIR="/opt/megafama/app"
ENV_FILE="$APP_DIR/.env.production"

# Carrega variáveis
POSTGRES_USER="megafama_app"
POSTGRES_DB="megafama"

if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# 2. Validação dos Parâmetros de Entrada
if [ $# -ne 1 ]; then
  echo "❌ ERRO: Uso incorreto."
  echo "Uso: $0 <caminho-do-arquivo-backup.dump>"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ ERRO: O arquivo de backup especificado não existe: $BACKUP_FILE"
  exit 1
fi

echo "🔍 Validando integridade do arquivo de backup..."
cd "$APP_DIR"

if ! docker compose ps | grep -q "megafama_postgres"; then
  echo "❌ ERRO: O container de banco de dados 'megafama_postgres' não está em execução."
  exit 1
fi

if ! docker compose exec -T postgres pg_restore --list < "$BACKUP_FILE" > /dev/null; then
  echo "❌ ERRO: O arquivo de backup é inválido ou está corrompido."
  exit 1
fi

echo "✅ Backup íntegro e validado."

# 3. Confirmação do Operador
echo "--------------------------------------------------------"
echo "🚨 ADVERTÊNCIA DE SUBSTITUIÇÃO DE BANCO DE DADOS 🚨"
echo "--------------------------------------------------------"
echo "Você está prestes a restaurar o banco de dados."
echo "Arquivo de backup: $BACKUP_FILE"
echo "Banco de dados destino: $POSTGRES_DB"
echo "Usuário destino: $POSTGRES_USER"
echo ""
echo "⚠️  ATENÇÃO: Todos os dados atuais no banco serão substituídos!"
echo "--------------------------------------------------------"
read -p "Tem certeza absoluta que deseja prosseguir? Digite 'RESTAURAR' para confirmar: " CONFIRM

if [ "$CONFIRM" != "RESTAURAR" ]; then
  echo "❌ Operação cancelada pelo operador."
  exit 0
fi

# 4. Criar backup de segurança (rollback point)
echo "🔒 Criando backup de segurança automático antes de restaurar..."
BACKUP_SAFETY_FILE="/tmp/megafama_safety_before_restore_$(date '+%Y-%m-%d_%H%M%S').dump"

if ! docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$BACKUP_SAFETY_FILE"; then
  echo "⚠️ ALERTA: Não foi possível criar o backup de segurança. Prossiga com extrema cautela."
else
  echo "✅ Backup de segurança salvo em: $BACKUP_SAFETY_FILE"
fi

# 5. Termina conexões ativas com o banco para evitar locks de restauração
echo "🔌 Encerrando conexões ativas com o banco de dados $POSTGRES_DB..."
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d postgres -c \
  "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();" > /dev/null || true

# 6. Executa a restauração (clean drops tables, no-owner, no-privileges)
echo "⚡ Restaurando esquema e dados..."
if ! docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --no-owner --no-privileges < "$BACKUP_FILE"; then
  echo "❌ ERRO: Ocorreu uma falha durante a restauração do banco de dados."
  if [ -f "$BACKUP_SAFETY_FILE" ]; then
    echo "💡 Tente restaurar o arquivo de segurança para reverter: $BACKUP_SAFETY_FILE"
  fi
  exit 1
fi

# 7. Verifica se a aplicação e banco estão saudáveis pós-restauração
echo "🧪 Executando testes pós-restauração..."
sleep 2

if ! docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null; then
  echo "❌ ERRO: O banco de dados está inacessível após a restauração."
  exit 1
fi

echo "✅ Restauração concluída com absoluto sucesso!"
echo "🎉 O banco está online e pronto para uso."
exit 0
