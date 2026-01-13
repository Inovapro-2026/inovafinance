#!/bin/bash

# Script para iniciar Traefik via PM2

# Criar arquivo de certificados se não existir
if [ ! -f "/root/INOVAFINANCE/traefik-pm2/certs/acme.json" ]; then
    echo "Criando arquivo de certificados..."
    touch /root/INOVAFINANCE/traefik-pm2/certs/acme.json
    chmod 600 /root/INOVAFINANCE/traefik-pm2/certs/acme.json
fi

# Limpar logs antigos se existirem
if [ -f "/root/INOVAFINANCE/traefik-pm2/logs/traefik.log" ]; then
    echo "Limpando logs antigos..."
    > /root/INOVAFINANCE/traefik-pm2/logs/traefik.log
    > /root/INOVAFINANCE/traefik-pm2/logs/access.log
fi

# Iniciar Traefik
echo "Iniciando Traefik..."
cd /root/INOVAFINANCE/traefik-pm2
./traefik --configFile=traefik.yml
