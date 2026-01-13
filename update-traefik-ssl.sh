#!/bin/bash

# Parar o Traefik atual
echo "Parando Traefik atual..."
cd /root/INOVAPRO/isa-1.0-de9193c7
docker-compose down traefik

# Criar arquivo de certificados
echo "Criando arquivo de certificados..."
touch /root/INOVAFINANCE/acme.json
chmod 600 /root/INOVAFINANCE/acme.json

# Copiar configuração dinâmica
echo "Copiando configuração dinâmica..."
cp /root/INOVAFINANCE/traefik_dynamic_complete.yml /root/INOVAFINANCE/traefik_dynamic.yml

# Iniciar Traefik com nova configuração
echo "Iniciando Traefik com SSL..."
docker run -d \
  --name traefik \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -p 8080:8080 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /root/INOVAFINANCE/traefik_dynamic.yml:/etc/traefik/dynamic/traefik_dynamic.yml:ro \
  -v /root/INOVAFINANCE/acme.json:/etc/traefik/acme.json \
  traefik:v2.10 \
  --api.insecure=true \
  --providers.docker=true \
  --providers.docker.exposedbydefault=false \
  --providers.file.directory=/etc/traefik/dynamic \
  --providers.file.watch=true \
  --entrypoints.web.address=:80 \
  --entrypoints.websecure.address=:443 \
  --certificatesresolvers.myresolver.acme.tlschallenge=true \
  --certificatesresolvers.myresolver.acme.email=admin@inovapro.cloud \
  --certificatesresolvers.myresolver.acme.storage=/etc/traefik/acme.json

echo "Traefik reiniciado com SSL!"
echo "Aguardando 10 segundos para inicialização..."
sleep 10

# Verificar logs
echo "Verificando logs do Traefik:"
docker logs traefik --tail 20