# PROMPT PARA TRANSFERIR TRAEFIK DO DOCKER PARA PM2

## CONTEXTO ATUAL:
- **Traefik atual**: Rodando em Docker container
- **Problemas identificados**: Configuração de rede complexa, timeouts 504, dificuldade de integração
- **Objetivo**: Migrar Traefik para PM2 para melhor integração com stack existente
- **Serviços PM2 atuais**: isa-frontend, isa-whatsapp, hub-api, hub-frontend, inovabank, kokoro-api

## ARQUITETURA PROPOSTA:
```
PM2 Process Stack:
├─ isa-frontend (porta 9001)
├─ isa-whatsapp (porta 3001) 
├─ hub-api (porta 3003)
├─ hub-frontend (porta 3002)
├─ inovabank (porta 8083) 
├─ kokoro-api (porta 8082)
└─ traefik (portas 80, 443, 8080) ← NOVO
```

## TAREFAS NECESSÁRIAS:

### 1. PREPARAR AMBIENTE PM2 PARA TRAEFIK:
```bash
# Criar diretório para Traefik
mkdir -p /root/INOVAFINANCE/traefik-pm2
cd /root/INOVAFINANCE/traefik-pm2

# Baixar binário Traefik
wget https://github.com/traefik/traefik/releases/download/v2.10.7/traefik_v2.10.7_linux_amd64.tar.gz
tar -xzf traefik_v2.10.7_linux_amd64.tar.gz
chmod +x traefik

# Criar estrutura de diretórios
mkdir -p config/dynamic logs certs
```

### 2. CRIAR ARQUIVO DE CONFIGURAÇÃO TRAEFIK YAML:
Criar `/root/INOVAFINANCE/traefik-pm2/traefik.yml`:
```yaml
# Configuração principal do Traefik
api:
  dashboard: true
  insecure: true

entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
  traefik:
    address: ":8080"

providers:
  file:
    directory: /root/INOVAFINANCE/traefik-pm2/config/dynamic
    watch: true

certificatesResolvers:
  myresolver:
    acme:
      email: admin@inovapro.cloud
      storage: /root/INOVAFINANCE/traefik-pm2/certs/acme.json
      tlsChallenge: {}

log:
  level: INFO
  filePath: /root/INOVAFINANCE/traefik-pm2/logs/traefik.log

accessLog:
  filePath: /root/INOVAFINANCE/traefik-pm2/logs/access.log
```

### 3. CRIAR CONFIGURAÇÃO DINÂMICA:
Criar `/root/INOVAFINANCE/traefik-pm2/config/dynamic/routes.yml`:
```yaml
http:
  routers:
    # Redirecionamento HTTP para HTTPS
    redirect-to-https:
      entryPoints:
        - web
      rule: "HostRegexp(`{host:.+}`)"
      middlewares:
        - redirectscheme
      service: noop

    # INOVABANK Router
    inovabank-router:
      rule: "Host(`inovabank.inovapro.cloud`)"
      entryPoints:
        - websecure
      service: inovabank-service
      tls:
        certResolver: myresolver

    # Kokoro TTS Router
    kokoro-tts-router:
      rule: "Host(`inovabank.inovapro.cloud`) && PathPrefix(`/api/tts`)"
      entryPoints:
        - websecure
      service: kokoro-tts-service
      tls:
        certResolver: myresolver

    # ISA Frontend Router
    isa-frontend-router:
      rule: "Host(`isa.inovapro.cloud`)"
      entryPoints:
        - websecure
      service: isa-frontend-service
      tls:
        certResolver: myresolver

    # ISA Backend Router
    isa-backend-router:
      rule: "Host(`isa.inovapro.cloud`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      service: isa-backend-service
      tls:
        certResolver: myresolver

    # Hub Frontend Router
    hub-frontend-router:
      rule: "Host(`hub.inovapro.cloud`)"
      entryPoints:
        - websecure
      service: hub-frontend-service
      tls:
        certResolver: myresolver

    # Hub Backend Router
    hub-backend-router:
      rule: "Host(`hub.inovapro.cloud`) && PathPrefix(`/api`)"
      entryPoints:
        - websecure
      service: hub-backend-service
      tls:
        certResolver: myresolver

  services:
    inovabank-service:
      loadBalancer:
        servers:
          - url: "http://localhost:8083"
    
    kokoro-tts-service:
      loadBalancer:
        servers:
          - url: "http://localhost:8082"
    
    isa-frontend-service:
      loadBalancer:
        servers:
          - url: "http://localhost:9001"
    
    isa-backend-service:
      loadBalancer:
        servers:
          - url: "http://localhost:3001"
    
    hub-frontend-service:
      loadBalancer:
        servers:
          - url: "http://localhost:3002"
    
    hub-backend-service:
      loadBalancer:
        servers:
          - url: "http://localhost:3003"
    
    noop:
      loadBalancer:
        servers:
          - url: "http://localhost:9999"

  middlewares:
    redirectscheme:
      redirectScheme:
        scheme: https
        permanent: true
```

### 4. CRIAR SCRIPT DE INICIALIZAÇÃO PM2:
Criar `/root/INOVAFINANCE/traefik-pm2/start-traefik.sh`:
```bash
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
```

### 5. CONFIGURAR PM2:
```bash
# Tornar script executável
chmod +x /root/INOVAFINANCE/traefik-pm2/start-traefik.sh

# Criar configuração PM2
cat > /root/INOVAFINANCE/traefik-pm2/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'traefik',
    script: '/root/INOVAFINANCE/traefik-pm2/start-traefik.sh',
    cwd: '/root/INOVAFINANCE/traefik-pm2',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-error.log',
    out_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-out.log',
    log_file: '/root/INOVAFINANCE/traefik-pm2/logs/pm2-combined.log',
    time: true
  }]
};
EOF
```

### 6. PARAR TRAEFIK DOCKER E INICIAR PM2:
```bash
# Parar e remover Traefik Docker
docker stop traefik-traefik-1 traefik
docker rm traefik-traefik-1 traefik

# Iniciar com PM2
cd /root/INOVAFINANCE/traefik-pm2
pm2 start ecosystem.config.js

# Salvar configuração PM2
pm2 save

# Configurar inicialização automática
pm2 startup systemd
```

### 7. VERIFICAÇÃO E TESTES:
```bash
# Verificar status
pm2 status
pm2 logs traefik --lines 50

# Testar conectividade
netstat -tlnp | grep -E ':(80|443|8080)'

# Testar rotas
curl -I http://localhost:80
curl -I http://localhost:8080

# Testar domínios (após DNS configurado)
curl -I http://inovabank.inovapro.cloud
curl -I https://inovabank.inovapro.cloud

# Testar serviços individuais
curl -I http://localhost:8083  # INOVABANK
curl -I http://localhost:8082  # Kokoro API
curl -I http://localhost:9001  # ISA Frontend
```

### 8. COMANDOS DE GERENCIAMENTO PM2:
```bash
# Reiniciar Traefik
pm2 restart traefik

# Ver logs em tempo real
pm2 logs traefik --lines 100 -f

# Parar Traefik
pm2 stop traefik

# Remover do PM2
pm2 delete traefik

# Ver uso de recursos
pm2 monit
```

## BENEFÍCIOS DA MIGRAÇÃO:
1. **Integração total**: Todos os serviços no mesmo gerenciador (PM2)
2. **Logs centralizados**: Fácil debug e monitoramento
3. **Restart automático**: PM2 gerencia reinícios
4. **Menor overhead**: Sem container Docker
5. **Configuração simples**: Arquivos YAML e shell scripts
6. **Portas diretas**: Sem complicações de rede Docker

## ARQUITETURA FINAL ESPERADA:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Porta 80/443  │    │   PM2 Traefik   │    │  Serviços PM2   │
│   (HTTP/HTTPS)  │◄──►│  (Load Balancer)│◄──►│ (localhost:XXXX)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Let's Encrypt │    │  INOVABANK:8083 │
                       │     ACME        │    │  Kokoro:8082    │
                       └─────────────────┘    │  ISA:9001/3001  │
                                             │  HUB:3002/3003  │
                                             └─────────────────┘
```

## NOTAS IMPORTANTES:
1. **Backup**: Fazer backup da configuração Docker atual antes de migrar
2. **Portas**: Certificar-se de que as portas 80, 443, 8080 estão livres
3. **Permissões**: Script precisa de permissão de execução
4. **Logs**: Monitorar logs após migração
5. **DNS**: Verificar se domínios ainda apontam para o servidor
6. **Firewall**: Certificar-se que portas 80/443 estão abertas

## COMANDOS ÚTEIS PARA DEBUG:
```bash
# Verificar portas em uso
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :8080

# Verificar processos PM2
pm2 list
pm2 show traefik

# Logs detalhados
tail -f /root/INOVAFINANCE/traefik-pm2/logs/traefik.log
tail -f /root/INOVAFINANCE/traefik-pm2/logs/access.log

# Testar configuração Traefik
./traefik --configFile=traefik.yml --log.level=DEBUG
```

Por favor, execute esta migração para simplificar a gestão e resolver os problemas de conectividade atual.