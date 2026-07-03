#!/usr/bin/env bash
# =========================================================================
# SCRIPT DE AGENDAMENTO AUTOMÁTICO DE BACKUP (DOCKER / VPS HOSTINGER)
# =========================================================================
set -Eeuo pipefail

# Caminhos absolutos
APP_DIR="/opt/megafama/app"
BACKUP_SCRIPT="$APP_DIR/scripts/backup-db.sh"

echo "⏰ Configurando agendamento do backup diário do PostgreSQL..."

# 1. Ajusta permissões do script de backup
chmod +x "$BACKUP_SCRIPT"

# 2. Configura Timezone para America/Sao_Paulo (Horário padrão da aplicação)
echo "🌐 Configurando timezone da VPS para America/Sao_Paulo..."
if command -v timedatectl >/dev/null; then
  sudo timedatectl set-timezone America/Sao_Paulo
  echo "✅ Timezone ajustado para: $(date)"
else
  echo "⚠️  timedatectl não encontrado. Certifique-se de configurar a timezone manual da VPS."
fi

# 3. Escolhe entre Systemd Timer (Recomendado) ou Cron (Fallback)
if command -v systemctl >/dev/null && [ -d /etc/systemd/system ]; then
  echo "⚙️  Instalando serviço de backup via Systemd (Timer)..."

  # Cria o arquivo de serviço
  cat <<EOF | sudo tee /etc/systemd/system/megafama-backup.service > /dev/null
[Unit]
Description=Mega Fama PostgreSQL Daily Backup
After=docker.service

[Service]
Type=oneshot
ExecStart=$BACKUP_SCRIPT
WorkingDirectory=$APP_DIR
StandardOutput=journal
StandardError=journal
EOF

  # Cria o arquivo de timer (executa diariamente às 03:00)
  cat <<EOF | sudo tee /etc/systemd/system/megafama-backup.timer > /dev/null
[Unit]
Description=Mega Fama PostgreSQL Daily Backup Timer

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

  # Recarrega daemons, habilita e inicia o timer
  sudo systemctl daemon-reload
  sudo systemctl enable megafama-backup.timer
  sudo systemctl start megafama-backup.timer

  echo "✅ Systemd Timer agendado com sucesso para rodar às 03:00 diariamente."
  echo "🔍 Para verificar o status do timer run: systemctl status megafama-backup.timer"
  echo "🔍 Para ler os logs de backup run: journalctl -u megafama-backup.service"

else
  # Fallback para o Cron
  echo "⚙️  Systemd não disponível. Instalando agendamento via Cron (fallback)..."
  
  CRON_JOB="0 3 * * * $BACKUP_SCRIPT >> /opt/megafama/logs/backup.log 2>&1"
  
  # Garante diretório de logs
  mkdir -p /opt/megafama/logs

  # Evita duplicidade no crontab
  (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" ; echo "$CRON_JOB") | crontab -
  
  echo "✅ Cron Job agendado com sucesso no crontab do usuário para rodar às 03:00."
  echo "🔍 Logs salvos em: /opt/megafama/logs/backup.log"
fi

exit 0
