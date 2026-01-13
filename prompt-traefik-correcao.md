# PROMPT PARA CORREÇÃO DO TRAEFIK - MÚLTIPLOS DOMÍNIOS

## PROBLEMAS IDENTIFICADOS ATUALMENTE:
1. **Erro de Conexão Recusada**: "ERR_CONNECTION_REFUSED" ao acessar https://inovabank.inovapro.cloud
2. **Porta 443 não mapeada**: Traefik só está escutando na porta 80 (HTTP), faltando HTTPS
3. **Configuração SSL incompleta**: Faltando certificados ACME/Let's Encrypt
4. **Configuração dinâmica não carregada**: Arquivo traefik_dynamic.yml não está sendo usado

## CONTEXTO DO SISTEMA:
- **Servidor**: Linux com Docker
- **Traefik versão**: v2.10 
- **Portas disponíveis**: 80, 443, 8080
- **Domínios existentes**: isa.inovapro.cloud, hub.inovapro.cloud
- **Domínio problema**: inovabank.inovapro.cloud
- **Novos domínios para adicionar**: [PREENCHER COM NOVOS DOMÍNIOS]

## SERVIÇOS ATUAIS E PORTAS:
```
PM2 Status:
- isa-frontend: porta 9001
- isa-whatsapp: porta 3001  
- hub-api: porta 3003
- hub-frontend: porta 3002
- inovabank: porta 8083 (Vite dev server)
- kokoro-api: porta 8082 (FastAPI TTS)
```

## ARQUIVOS DE CONFIGURAÇÃO EXISTENTES:
1. `/root/INOVAPRO/isa-1.0-de9193c7/docker-compose.yml` - Config base Traefik
2. `/root/INOVAPRO/isa-1.0-de9193c7/traefik_dynamic.yml` - Rotas dinâmicas atuais
3. `/root/INOVAFINANCE/traefik_dynamic_complete.yml` - Config completa com SSL

## TAREFAS NECESSÁRIAS:

### 1. CORRIGIR CONFIGURAÇÃO ATUAL DO TRAEFIK:
```bash
# Parar Traefik atual
docker stop traefik-traefik-1 traefik
docker rm traefik-traefik-1 traefik

# Criar arquivo de certificados
touch /root/INOVAFINANCE/acme.json
chmod 600 /root/INOVAFINANCE/acme.json
```

### 2. ATUALIZAR DOCKER-COMPOSE COM SSL:
Adicionar ao docker-compose.yml do ISA:
```yaml
command:
  - "--api.insecure=true"
  - "--providers.docker=true" 
  - "--providers.docker.exposedbydefault=false"
  - "--providers.file.directory=/etc/traefik/dynamic"
  - "--providers.file.watch=true"
  - "--entrypoints.web.address=:80"
  - "--entrypoints.websecure.address=:443"
  - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
  - "--certificatesresolvers.myresolver.acme.email=admin@inovapro.cloud"
  - "--certificatesresolvers.myresolver.acme.storage=/etc/traefik/acme.json"
volumes:
  - "/var/run/docker.sock:/var/run/docker.sock:ro"
  - "/root/INOVAFINANCE/traefik_dynamic.yml:/etc/traefik/dynamic/traefik_dynamic.yml:ro"
  - "/root/INOVAFINANCE/acme.json:/etc/traefik/acme.json"
```

### 3. CRIAR CONFIGURAÇÃO DINÂMICA COMPLETA:
Criar `/root/INOVAFINANCE/traefik_dynamic_final.yml` com:
```yaml
http:
  routers:
    # Redirecionamento HTTP para HTTPS
    inovabank-http-router:
      rule: "Host(`inovabank.inovapro.cloud`)"
      service: inovabank-service
      entryPoints: [web]
      middlewares: [redirect-to-https]
      priority: 1
    
    inovabank-https-router:
      rule: "Host(`inovabank.inovapro.cloud`)"
      service: inovabank-service
      entryPoints: [websecure]
      tls: {certResolver: myresolver}
      priority: 1
    
    kokoro-tts-router:
      rule: "Host(`inovabank.inovapro.cloud`) && PathPrefix(`/api/tts`)"
      service: kokoro-tts-service
      entryPoints: [websecure]
      tls: {certResolver: myresolver}
      priority: 50

  services:
    inovabank-service:
      loadBalancer:
        servers:
          - url: "http://172.17.0.1:8083"
    
    kokoro-tts-service:
      loadBalancer:
        servers:
          - url: "http://172.17.0.1:8082"

  middlewares:
    redirect-to-https:
      redirectScheme:
        scheme: https
        permanent: true
```

### 4. ADICIONAR NOVOS DOMÍNIOS:
[INCLUIR AQUI OS NOVOS DOMÍNIOS E SEUS SERVIÇOS]
Exemplo de estrutura para novos domínios:
```yaml
novo-dominio-router:
  rule: "Host(`novo-dominio.inovapro.cloud`)"
  service: novo-dominio-service
  entryPoints: [websecure]
  tls: {certResolver: myresolver}
  priority: 1

novo-dominio-service:
  loadBalancer:
    servers:
      - url: "http://172.17.0.1:PORTA_NOVO_SERVICO"
```

### 5. VERIFICAÇÕES FINAIS:
```bash
# Verificar se Traefik está rodando com SSL
docker ps | grep traefik
docker port traefik
# Deve mostrar: 80:80, 443:443, 8080:8080

# Testar conexões
curl -I https://inovabank.inovapro.cloud
curl -I https://isa.inovapro.cloud
curl -I https://hub.inovapro.cloud

# Verificar logs
docker logs traefik --tail 50
```

## ERROS COMUNS A EVITAR:
1. **Não esquecer porta 443**: Sempre mapear `-p 443:443`
2. **Certificados Let's Encrypt**: Aguardar alguns segundos para geração
3. **Firewall**: Verificar se portas 80/443 estão abertas
4. **DNS**: Confirmar que domínios apontam para o servidor
5. **Network**: Usar `172.17.0.1` para acessar serviços no host

## COMANDOS ÚTEIS PARA DEBUG:
```bash
# Ver configuração carregada
curl http://localhost:8080/api/http/routers

# Testar serviços individualmente
curl http://localhost:8083/  # INOVABANK
curl http://localhost:8082/health  # Kokoro API

# Verificar certificados
openssl s_client -connect inovabank.inovapro.cloud:443
```

## PRIORIDADES:
1. 🔴 **CRÍTICO**: Corrigir porta 443 do Traefik
2. 🟡 **ALTO**: Configurar SSL com Let's Encrypt  
3. 🟢 **MÉDIO**: Adicionar novos domínios
4. 🟢 **BAIXO**: Otimizar configurações

Por favor, execute estas correções e adicione os novos domínios especificados.