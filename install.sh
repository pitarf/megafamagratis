#!/bin/bash

# =========================================================================
# Mega Fama - Script de Instalação (Primeiro Deploy)
# =========================================================================
# Este script deve ser executado na raiz do repositório clonado na VPS.
# Ele verificará os pré-requisitos, preparará o ambiente e fará o build inicial.

set -e # Sai imediatamente se um comando falhar

echo "========================================================================="
echo "🚀 Iniciando a Instalação do Mega Fama..."
echo "========================================================================="

# 1. Verifica pré-requisitos
if ! command -v docker &> /dev/null; then
    echo "❌ ERRO: O Docker não está instalado nesta máquina."
    exit 1
fi

if ! docker compose version &> /dev/null && ! docker-compose --version &> /dev/null; then
    echo "❌ ERRO: O Docker Compose não está instalado nesta máquina."
    exit 1
fi

# 2. Configuração de Variáveis de Ambiente
if [ -f ".env.production" ]; then
    echo "✅ Arquivo .env.production encontrado."
else
    echo "⚠️ Arquivo .env.production não encontrado."
    if [ -f ".env.example" ]; then
        echo "📝 Criando .env.production a partir de .env.example..."
        cp .env.example .env.production
        echo "⚠️  ATENÇÃO: Você precisa editar o arquivo .env.production com suas credenciais (Senhas, Banco, API Keys)."
        echo "   Use o comando: nano .env.production"
        echo "   Depois de editar, rode este script novamente."
        exit 1
    else
        echo "❌ ERRO: Arquivo .env.example não encontrado para servir de base."
        exit 1
    fi
fi

# Usa docker compose ou docker-compose dependendo da versão
DOCKER_CMD="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_CMD="docker-compose"
fi

# 3. Permissões de arquivos
echo "🔒 Ajustando permissões (se necessário)..."
chmod +x update.sh install.sh

# 4. Primeira Inicialização com Docker
echo "📦 Construindo as imagens e subindo os containers pela primeira vez..."
$DOCKER_CMD -f docker-compose.prod.yml --env-file .env.production up -d --build

echo "========================================================================="
echo "✅ Instalação concluída com sucesso!"
echo "========================================================================="
echo "O banco de dados PostgreSQL iniciará agora e, caso o arquivo 'init_database_megafama.sql'"
echo "esteja na pasta, os dados preexistentes serão automaticamente restaurados."
echo ""
echo "Para ver os logs em tempo real, use o comando:"
echo "  $DOCKER_CMD -f docker-compose.prod.yml logs -f app"
echo "========================================================================="
