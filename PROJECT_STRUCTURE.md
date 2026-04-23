# 📁 Estrutura do Projeto - Referência Rápida

## Visão Geral
```
backend/
├── src/                          # Código-fonte TypeScript
│   ├── config/
│   │   └── index.ts             # Configuração centralizada
│   │
│   ├── middleware/
│   │   ├── security.ts          # Helmet, CORS, Rate Limit
│   │   └── errorHandler.ts      # Validação, erro global
│   │
│   ├── routes/
│   │   ├── auth.routes.ts       # OAuth2, login, signup, logout
│   │   ├── accounts.routes.ts   # Gerenciamento de contas
│   │   └── trading.routes.ts    # Trading operations
│   │
│   ├── services/
│   │   ├── auth.service.ts      # PKCE, estado, token exchange
│   │   ├── deriv-api.service.ts # REST API Deriv
│   │   └── trading.service.ts   # Trading logic
│   │
│   ├── websocket/
│   │   └── manager.ts           # WebSocket com reconexão/heartbeat
│   │
│   ├── types/
│   │   ├── schemas.ts           # Zod schemas de validação
│   │   └── errors.ts            # Tipos de erro customizados
│   │
│   ├── utils/
│   │   └── logger.ts            # Winston logger
│   │
│   └── server.ts                # Entrada principal, Express setup
│
├── dist/                        # Código compilado (gerado)
├── logs/                        # Arquivo de logs
├── examples/
│   └── deriv-client.ts         # Cliente exemplo para frontend
│
├── .env.example                 # Template variáveis
├── .env.development            # Desenvolvimento
├── .env.production             # Produção
├── .env.local                  # Local (não versionar)
│
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── ecosystem.config.js         # PM2 config
│
├── Dockerfile                  # Container image
├── docker-compose.yml          # Docker services
│
├── README.md                   # Documentação completa
├── QUICKSTART.md               # Setup rápido
├── ARCHITECTURE.md             # Padrões e boas práticas
├── DEPLOYMENT.md               # Produção e deployment
│
├── .gitignore                  # Git ignore
└── .dockerignore               # Docker ignore
```

---

## 🔑 Arquivos Principais

### 1. **src/server.ts**
- Inicializa Express app
- Configura middleware de segurança
- Define rotas
- Inicia servidor HTTP
- Graceful shutdown

### 2. **src/config/index.ts**
- Lê variáveis .env
- Valida configuração
- Exporta config tipada

### 3. **src/middleware/security.ts**
```
- Helmet: Headers de segurança
- CORS: Validação de origem
- Rate Limiting: Proteção contra abuso
- Request Logger: Logging de requisições
```

### 4. **src/middleware/errorHandler.ts**
```
- Validação com Zod
- Captura de erros global
- Formatação de resposta
- Sem exposição de stack traces
```

### 5. **src/services/auth.service.ts**
- ✅ PKCE generation e validation
- ✅ Authorization URL building
- ✅ Code-to-token exchange
- ✅ Session management

### 6. **src/services/deriv-api.service.ts**
- ✅ REST API calls
- ✅ Account operations
- ✅ OTP generation
- ✅ Error handling

### 7. **src/services/trading.service.ts**
- ✅ WebSocket management
- ✅ Trading operations (buy, sell)
- ✅ Market data subscriptions
- ✅ Balance tracking

### 8. **src/websocket/manager.ts**
```
Recursos:
- Auto-reconnect com exponential backoff
- Heartbeat/ping-pong automático
- Fila de mensagens em offline
- Gerenciamento de subscrições
- Limpeza automática
```

---

## 🔗 Fluxo de Requisição

### Login Flow
```
1. GET /api/auth/login
   ↓
2. AuthService.buildAuthorizationUrl()
   ├─ Gera PKCE (code_verifier + code_challenge)
   ├─ Gera state (CSRF)
   ├─ Armazena em session
   └─ Retorna URL OAuth
   ↓
3. Cliente redireciona usuário para URL Deriv
   ↓
4. Usuário faz login na Deriv
   ↓
5. Deriv redireciona para /api/auth/callback?code=...&state=...
   ↓
6. AuthService.exchangeCodeForToken()
   ├─ Valida state
   ├─ Recupera code_verifier da session
   ├─ POST para token endpoint Deriv
   ├─ Recebe access_token
   └─ Retorna ao cliente
   ↓
7. Cliente armazena token (localStorage/cookie)
```

### Trading Flow
```
1. POST /api/trading/init { accountId }
   ↓
2. DerivAPIService.getOTP() → recebe WebSocket URL
   ↓
3. TradingService(otpUrl)
   ├─ WebSocketManager conecta
   ├─ Inicia heartbeat
   └─ Retorna sessionId
   ↓
4. POST /api/trading/proposal { symbol, amount, ... }
   ├─ WebSocket envia proposal request
   ├─ Retorna proposal.id + preço
   
5. POST /api/trading/buy { proposalId, maxPrice }
   ├─ WebSocket envia buy request
   ├─ Retorna contractId + saldo atualizado

6. GET /api/trading/balance
   ├─ WebSocket envia balance request
   ├─ Retorna saldo em tempo real
```

---

## 📊 Tipos de Dados Principais

### Session (AuthService)
```typescript
{
  accessToken: "ory_at_...",
  expiresAt: 1234567890,
  userId: "uuid",
}
```

### WebSocket Message
```typescript
{
  req_id: "uuid",
  msg_type: "proposal" | "buy" | "balance" | ...,
  [msg_type]: { ...dados },
  error?: { code: string, message: string }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Description",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

---

## 🔐 Segurança em Camadas

```
Layer 1: Transport
├─ HTTPS/TLS 1.2+
└─ Certificado válido

Layer 2: Application
├─ Helmet (headers de segurança)
├─ CORS (validação de origem)
├─ Rate Limiting (proteção DDoS)
└─ Input Validation (Zod)

Layer 3: Authentication
├─ OAuth2 com PKCE
├─ State validation (CSRF)
└─ Bearer tokens

Layer 4: Error Handling
├─ Sem stack traces em prod
├─ Mensagens genéricas
└─ Logging estruturado
```

---

## 📈 Performance Features

```
1. Connection Management
   - Heartbeat: 30s
   - Reconexão automática
   - Fila de mensagens

2. Subscriptions
   - Máximo: 100 por conexão
   - Cleanup automático
   - TTL configurável

3. Caching (Future)
   - Redis pub/sub
   - Session storage
   - Proposal cache

4. Scaling
   - PM2 cluster mode
   - Load balancing
   - Graceful restart
```

---

## 🛠️ Ferramentas Principais

| Ferramenta | Uso | Config |
|-----------|-----|--------|
| Express | Web framework | - |
| Helmet | Headers seguros | middleware/security.ts |
| CORS | Validação origem | middleware/security.ts |
| Rate Limit | Proteção DDoS | middleware/security.ts |
| Zod | Validação schemas | types/schemas.ts |
| Winston | Logging | utils/logger.ts |
| WebSocket | Conexão real-time | websocket/manager.ts |
| Axios | HTTP client | services/deriv-api.service.ts |
| PM2 | Process manager | ecosystem.config.js |

---

## 📝 Logging Levels

```
ERROR    → Erros críticos que precisam ação
WARN     → Situações anormais mas controláveis
INFO     → Eventos importantes e operacionais
DEBUG    → Informações detalhadas de debug
```

---

## 🚀 Deployment Targets

| Ambiente | Onde | Como |
|----------|------|------|
| Development | Localhost | `pnpm dev` |
| Staging | VPS/Docker | `pnpm build && pnpm start` |
| Production | VPS/PaaS | PM2 + Nginx / Docker / Railway |

---

## ❓ FAQ

### P: Como adicionar novo endpoint?
**R:** 1. Crie schema Zod em `types/schemas.ts`
2. Adicione método em `services/`
3. Crie rota em `routes/`
4. Use middleware de erro automático

### P: Como fazer deploy?
**R:** Ver `DEPLOYMENT.md` para 3 opções:
- VPS com PM2
- Docker Compose
- PaaS (Railway, Render)

### P: WebSocket desconecta frequentemente?
**R:** Verificar:
- Timeout de heartbeat (padrão 30s)
- Reconexão automática (5 tentativas)
- Logs para erros específicos

### P: Rate limit muito restritivo?
**R:** Ajustar em `.env`:
```env
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=900000
```

---

## 📚 Referências Rápidas

- [Deriv API](https://developers.deriv.com/docs/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OAuth 2.0 PKCE](https://tools.ietf.org/html/rfc7636)
- [Zod Documentation](https://zod.dev/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

---

**Última atualização:** 2024-04-23
**Versão:** 1.0.0
