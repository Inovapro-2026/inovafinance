#!/bin/bash

# Script para automatizar a atualização e redeploy do Inova Finance
# Repositório: https://github.com/Inovapro-2026/inova-finance-hub
# Mantendo as alterações locais (Branding INOVABANK)

cd /root/INOVAFINANCE/INOVABANK

echo "📦 Salvando alterações locais temporariamente..."
git stash

echo "🚀 Puxando atualizações do GitHub..."
git pull origin main

echo "🎨 Reaplicando personalizações locais..."
git stash pop

echo "🏗️ Gerando build do projeto..."
npm run build

echo "🔄 Reiniciando o serviço PM2..."
pm2 restart inovabank

echo "✅ Atualização concluída com sucesso!"
