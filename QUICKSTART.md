# 🚀 Quick Start Guide

Guia rápido para começar com o backend Deriv Trading API.

## ⚡ 5 Minutos Setup

### 1. Clone e Instale
```bash
cd backend
pnpm install
# ou: npm install
```

### 2. Configure .env
```bash
cp .env.development .env
```

Edite o `.env` com suas credenciais Deriv:
```env
DERIV_CLIENT_ID=seu_id
DERIV_CLIENT_SECRET=seu_secret
DERIV_REDIRECT_URI=http://localhost:3001/api/auth/callback
```

### 3. Inicie o Servidor
```bash
pnpm dev
```

Você verá:
```
╔════════════════════════════════════════════════════════════╗
║         Deriv Trading Backend Server Started              ║
║                                                            ║
║  🚀 API Server:   http://localhost:3001                   ║
║  📚 Health:       http://localhost:3001/health            ║
```

✅ **Pronto!** Seu backend está rodando.

---

## 🐳 Com Docker (Alternativa)

### 1. Inicie com Docker Compose
```bash
docker-compose up -d
```

Isso inicia:
- ✅ Backend na porta 3001
- ✅ Redis na porta 6379
- ✅ Logs estruturados

### 2. Verifique a saúde
```bash
curl http://localhost:3001/health
# Retorna: {"status":"ok",...}
```

### 3. Pare os serviços
```bash
docker-compose down
```

---

## 📝 Primeiros Passos

### 1. Login
```bash
curl http://localhost:3001/api/auth/login
```

Resposta:
```json
{
  "authUrl": "https://auth.deriv.com/oauth2/auth?..."
}
```

Redirecione o usuário para esta URL.

### 2. Callback (após login)
A Deriv redireciona para: `http://localhost:3001/api/auth/callback?code=...&state=...`

Backend automaticamente troca o código por um token e retorna:
```json
{
  "success": true,
  "data": {
    "accessToken": "ory_at_...",
    "expiresIn": 3600,
    "userId": "uuid"
  }
}
```

### 3. Listar Contas
```bash
curl http://localhost:3001/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Criar Conta Demo
```bash
curl -X POST http://localhost:3001/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "USD",
    "group": "row",
    "accountType": "demo"
  }'
```

### 5. Iniciar Trading
```bash
curl -X POST http://localhost:3001/api/trading/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "DOT90004580"}'
```

Retorna um `sessionId` para usar em requisições de trading.

### 6. Obter Símbolos
```bash
curl "http://localhost:3001/api/trading/symbols?sessionId=SESSION_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔧 Comandos Úteis

### Development
```bash
pnpm dev              # Inicia em modo watch
pnpm build            # Compila TypeScript
pnpm start            # Rodada compilada
pnpm lint             # Verifica código
pnpm format           # Formata código
```

### PM2 (Produção)
```bash
pnpm start:pm2        # Inicia com PM2 cluster mode
pnpm logs             # Ver logs em tempo real
pnpm stop:pm2         # Para servidor

# Monitoramento
pm2 status
pm2 monit
pm2 logs all
```

### Docker
```bash
docker-compose up -d           # Inicia
docker-compose logs -f         # Ver logs
docker-compose down            # Para
docker-compose ps              # Status
```

---

## 📋 Checklist de Configuração

- [ ] Node.js 18+ instalado (`node -v`)
- [ ] Dependências instaladas (`pnpm install`)
- [ ] `.env` configurado com credenciais Deriv
- [ ] Redis instalado/rodando (ou Docker)
- [ ] Servidor inicia sem erros
- [ ] `/health` retorna 200 OK
- [ ] Teste login funciona

---

## 🚨 Problemas Comuns

### "Cannot find module '@config'"
```bash
# Certifique-se de compilar TypeScript
pnpm build
```

### "CORS not allowed"
```env
# Adicione seu frontend em CORS_ORIGIN
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

### "Failed to connect to Redis"
```bash
# Se não estiver usando Docker, instale Redis:
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
# Ou use Docker: docker-compose up -d redis
```

### "Rate limit exceeded"
```env
# Aumentar limites em desenvolvimento
RATE_LIMIT_MAX_REQUESTS=1000
```

---

## 📚 Documentação Completa

- 📖 [README.md](./README.md) - Documentação completa
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura e padrões
- 📝 [examples/](./examples/) - Exemplos de cliente
- 🔗 [Deriv API Docs](https://developers.deriv.com/docs/)

---

## 🎯 Próximas Etapas

1. **Integre com Frontend**
   ```typescript
   import DerivTradingClient from './deriv-client';
   const client = new DerivTradingClient();
   ```

2. **Configure em Produção**
   - Copie `.env.production` e configure
   - Use PM2 ou Docker
   - Configure domínio e HTTPS

3. **Adicione Monitoramento**
   - Sentry para error tracking
   - DataDog ou New Relic para APM
   - Prometheus para métricas

4. **Otimize Performance**
   - Configure Redis para cache
   - Implemente database (PostgreSQL)
   - Setup CDN se necessário

---

**Desenvolvido com ❤️ para trading seguro**

Última atualização: 2024-04-23
