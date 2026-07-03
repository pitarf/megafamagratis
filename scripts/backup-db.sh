#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE BACKUP DIÁRIO DO POSTGRESQL (DOCKER / VPS HOSTINGER)
# =========================================================================
set -Eeuo pipefail

# 1. Configurações de Diretórios
APP_DIR="/opt/megafama/app"
ENV_FILE="$APP_DIR/.env.production"

# Fallbacks padrão
POSTGRES_USER="megafama_app"
POSTGRES_DB="megafama"
POSTGRES_BACKUP_DIR="/opt/megafama/backups/postgres"

# 2. Carrega variáveis de ambiente de produção
if [ -f "$ENV_FILE" ]; then
  # Carrega as variáveis sem imprimir nada
  set -a
  source "$ENV_FILE"
  set +a
fi

echo "📅 [$(date '+%Y-%m-%d %H:%M:%S')] Iniciando rotina de backup do banco de dados..."

# Garante que o diretório de backups existe com permissões seguras
mkdir -p "$POSTGRES_BACKUP_DIR"
chmod 700 "$POSTGRES_BACKUP_DIR"

# Nome do arquivo de backup com timestamp
TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
BACKUP_FILE="$POSTGRES_BACKUP_DIR/megafama_${TIMESTAMP}.dump"

# 3. Executa o pg_dump via Container Docker (Piped para o Host)
cd "$APP_DIR"

if ! docker compose ps | grep -q "megafama_postgres"; then
  echo "❌ ERRO: O container de banco de dados 'megafama_postgres' não está em execução."
  exit 1
fi

echo "📥 Extraindo dump do banco de dados..."
if ! docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$BACKUP_FILE"; then
  echo "❌ ERRO: Falha crítica ao extrair o dump do PostgreSQL."
  rm -f "$BACKUP_FILE"
  exit 1
fi

# 4. Validação do arquivo gerado
if [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ ERRO: O arquivo de backup gerado está vazio."
  rm -f "$BACKUP_FILE"
  exit 1
fi

echo "🔍 Validando integridade do backup..."
if ! docker compose exec -T postgres pg_restore --list < "$BACKUP_FILE" > /dev/null; then
  echo "❌ ERRO: O arquivo de backup gerado está corrompido ou é inválido."
  rm -f "$BACKUP_FILE"
  exit 1
fi

# Ajusta permissão restrita para o arquivo de backup
chmod 600 "$BACKUP_FILE"
echo "✅ Backup criado e validado com sucesso: $(basename "$BACKUP_FILE")"

# 5. Aplica a política de retenção de 7 dias (mantém os 7 mais recentes)
echo "🧹 Aplicando política de retenção (limite de 7 arquivos)..."
cd "$POSTGRES_BACKUP_DIR"

# Lista backups ordenados por data de modificação (mais recentes primeiro) e apaga a partir do 8º
BACKUP_LIST=$(ls -t megafama_*.dump 2>/dev/null || true)
COUNT=0

for FILE in $BACKUP_LIST; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -gt 7 ]; then
    echo "🗑️ Removendo backup antigo: $FILE"
    rm -f "$FILE"
  fi
done

# =========================================================================
# 6. ENVIO OPCIONAL PARA ARMAZENAMENTO S3 (DESATIVADO POR PADRÃO)
# =========================================================================
# Se as variáveis de S3 estiverem preenchidas no .env.production, realiza o upload.
# Exemplo de variáveis esperadas:
# S3_BUCKET="meubucket-backups"
# AWS_ACCESS_KEY_ID="chavedebac"
# AWS_SECRET_ACCESS_KEY="segredodebac"
# AWS_DEFAULT_REGION="us-east-1"
#
# if [ -n "${S3_BUCKET:-}" ] && [ -n "${AWS_ACCESS_KEY_ID:-}" ]; then
#   echo "☁️ Iniciando envio de backup para armazenamento S3..."
#   # Exemplo com AWS CLI dockerizado
#   docker run --rm \
#     -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION \
#     -v "$POSTGRES_BACKUP_DIR:/backups" \
#     amazon/aws-cli s3 cp "/backups/$(basename "$BACKUP_FILE")" "s3://$S3_BUCKET/$(basename "$BACKUP_FILE")"
# fi

echo "🎉 [$(date '+%Y-%m-%d %H:%M:%S')] Rotina de backup concluída com sucesso!"
exit 0
