# Deriv Trading Backend API

Um backend seguro e escalável para a Deriv API com suporte completo a WebSocket, autenticação OAuth2 com PKCE e gerenciamento de trading em tempo real.

## 🚀 Features

- ✅ **Autenticação OAuth2 com PKCE** - Login e signup seguros
- ✅ **WebSocket Robusto** - Reconexão automática com heartbeat
- ✅ **Trading em Tempo Real** - Propostas, compra/venda de contratos
- ✅ **Segurança Enterprise** - Helmet, CORS, Rate Limiting, Validação
- ✅ **Logging Estruturado** - Winston com rotação de logs
- ✅ **Escalabilidade** - PM2 com cluster mode
- ✅ **Tratamento de Erros Global** - Middleware de erro centralizado
- ✅ **Validação de Dados** - Zod schemas para todas as rotas

## 📋 Requisitos

- Node.js 18+
- npm ou pnpm
- Redis (opcional, para escalabilidade futura)

## 🔧 Instalação

### 1. Clone o repositório
```bash
git clone <repo-url>
cd backend
```

### 2. Instale as dependências
```bash
pnpm install
# ou
npm install
```

### 3. Configure variáveis de ambiente
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```env
# Deriv OAuth
DERIV_CLIENT_ID=seu_client_id
DERIV_CLIENT_SECRET=seu_client_secret
DERIV_REDIRECT_URI=http://localhost:3001/api/auth/callback

# Security
JWT_SECRET=sua_secret_key_aqui

# Frontend URLs
FRONTEND_URL=http://localhost:3000
```

## 🏃 Execução

### Desenvolvimento
```bash
pnpm dev
```

### Produção (Compilar TypeScript)
```bash
pnpm build
pnpm start
```

### Com PM2 (Escalabilidade)
```bash
pnpm start:pm2
pnpm logs        # Ver logs
pnpm stop:pm2    # Parar servidor
```

## 📚 Estrutura do Projeto

```
src/
├── config/           # Configuração centralizada
├── middleware/       # Middleware (segurança, erros, validação)
├── routes/           # Rotas da API
├── services/         # Lógica de negócio
│   ├── auth.service.ts       # OAuth2 com PKCE
│   ├── deriv-api.service.ts  # REST API Deriv
│   └── trading.service.ts    # Trading operations
├── websocket/        # Gerenciador WebSocket
├── types/            # TypeScript types e schemas
├── utils/            # Utilitários (logger)
└── server.ts         # Entrada principal
```

## 🔐 Segurança Implementada

### 1. **Helmet** - Headers de segurança
```
- Content Security Policy
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options
- X-Content-Type-Options
- XSS Protection
```

### 2. **CORS** - Controle de origem cruzada
```
- Origem whitelist configurável
- Credenciais ativadas
- Methods permitidos: GET, POST, PUT, DELETE, PATCH
```

### 3. **Rate Limiting**
```
- 100 requisições por 15 minutos (API geral)
- 5 requisições por 15 minutos (Auth endpoints)
- Baseado em IP/token
```

### 4. **Validação de Dados** (Zod)
```
- Todos os inputs validados
- Tipos TypeScript automáticos
- Erros estruturados
```

### 5. **Tratamento de Erros Global**
```
- Middleware centralizado
- Sem stack traces em produção
- Erros operacionais vs. servidores
```

## 🌐 Endpoints da API

### Authentication
```
GET  /api/auth/login          # Iniciar login
GET  /api/auth/signup         # Iniciar signup
GET  /api/auth/callback       # Callback OAuth2
POST /api/auth/logout         # Logout
GET  /api/auth/validate       # Validar token
```

### Accounts
```
GET  /api/accounts            # Listar contas
POST /api/accounts            # Criar conta
GET  /api/accounts/:id        # Detalhes da conta
POST /api/accounts/:id/otp    # Gerar OTP para WebSocket
POST /api/accounts/:id/reset  # Reset saldo demo
```

### Trading
```
POST /api/trading/init                # Inicializar sessão WebSocket
GET  /api/trading/symbols             # Listar símbolos
GET  /api/trading/contracts/:symbol   # Contratos disponíveis
POST /api/trading/proposal            # Obter proposta
POST /api/trading/buy                 # Comprar contrato
POST /api/trading/sell                # Vender contrato
GET  /api/trading/balance             # Saldo da conta
GET  /api/trading/portfolio           # Contratos abertos
GET  /api/trading/profit-table        # Histórico de lucros
```

## 🔄 WebSocket Features

### Reconexão Automática
```typescript
- Tentativas exponenciais (1s, 2s, 4s, 8s, 16s)
- Máximo de 5 tentativas configurável
- Fila de mensagens durante desconexão
```

### Heartbeat
```typescript
- Ping automático a cada 30 segundos
- Timeout de heartbeat: 5 segundos
- Reconexão automática se heartbeat falhar
```

### Gerenciamento de Subscrições
```typescript
- Máximo de 100 subscrições por conexão
- Limpeza automática de subscrições expiradas
- Suporte para forget/forget_all
```

## 📊 Exemplo de Uso

### 1. Login
```bash
curl http://localhost:3001/api/auth/login
# Retorna URL de autorização
```

### 2. Obter Token (via callback)
```bash
# Após usuario autorizar, você recebe:
{
  "success": true,
  "data": {
    "accessToken": "ory_at_...",
    "expiresIn": 3600,
    "userId": "uuid"
  }
}
```

### 3. Inicializar Trading
```bash
curl -X POST http://localhost:3001/api/trading/init \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId": "DOT90004580"}'

# Retorna sessionId para uso em requisições subsequentes
```

### 4. Obter Símbolos
```bash
curl http://localhost:3001/api/trading/symbols \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Session-ID: SESSION_ID"
```

### 5. Comprar Contrato
```bash
curl -X POST http://localhost:3001/api/trading/buy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "proposalId": "abc123xyz",
    "maxPrice": 10.50,
    "sessionId": "session123"
  }'
```

## 📈 Escalabilidade (PM2)

### Modo Cluster
```bash
pnpm start:pm2
```

O PM2 inicia N instâncias (= número de CPUs):
```
✓ PM2+ cluster mode
✓ Load balancing automático
✓ Restart gracioso
✓ Monitoramento
```

### Para Produção
```bash
# Com Redis (pub/sub para sincronização entre instâncias)
npm install redis

# PM2 Plus (optional, para dashboard)
pm2 plus
pm2 save
pm2 startup
```

## 🔍 Logging

### Winston Logger
```
- Arquivo: logs/app.log
- Erro: logs/error.log
- Rotação: max 5 arquivos de 10MB
- Console no desenvolvimento
```

### Níveis de Log
```
- error: Erros críticos
- warn: Avisos importantes
- info: Informações gerais
- debug: Debug detalhado
```

## 🧪 Testing

### Estrutura para testes (TODO)
```
tests/
├── unit/
├── integration/
└── e2e/
```

## 🚨 Troubleshooting

### Erro: "CORS not allowed"
```
Adicione a origem em CORS_ORIGIN no .env
```

### Erro: "Invalid state" no OAuth
```
Certifique-se que sessionStorage está ativado
State está sendo validado corretamente
```

### WebSocket não conecta
```
Verificar se OTP é válido
Conferir URL do WebSocket
Checar logs com: pnpm logs
```

### Rate limit atingido
```
Aguarde 15 minutos
Ou mude RATE_LIMIT_WINDOW_MS em .env
```

## 📝 Environment Variables

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `NODE_ENV` | development | Ambiente |
| `PORT` | 3001 | Porta do servidor |
| `DERIV_CLIENT_ID` | - | OAuth Client ID |
| `DERIV_CLIENT_SECRET` | - | OAuth Client Secret |
| `FRONTEND_URL` | http://localhost:3000 | URL do frontend |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Requisições por janela |
| `WS_HEARTBEAT_INTERVAL` | 30000 | Intervalo de heartbeat (ms) |
| `WS_RECONNECT_MAX_ATTEMPTS` | 5 | Tentativas de reconexão |
| `LOG_LEVEL` | info | Nível de logging |

## 📦 Deployment

### Docker (TODO)
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Railway / Vercel (TODO)
```
Push para Git
Conecte Railway/Vercel
Defina variáveis de ambiente
Deploy automático
```

## 🤝 Contribuindo

1. Create branch feature (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push para branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## 📞 Suporte

- Documentação Deriv: https://developers.deriv.com/docs/
- Issues: Abra uma issue no repositório

## 📄 Licença

MIT

---

# Fixes manuais necessários (3 arquivos)

## 1. src/server.ts — WebSocketServer

PROCURA:
  import WebSocket from 'ws'
  new WebSocket.Server(...)

SUBSTITUI POR:
  import { WebSocketServer } from 'ws'
  new WebSocketServer(...)

---

## 2. src/utils/redis.ts — URL do Redis

PROCURA:
  createClient({ host: '...', port: 6379 })

SUBSTITUI POR:
  createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })

---

## 3. src/websocket/manager.ts — MapIterator sem .map()

PROCURA:
  subscriptions.values().map(s => ...)

SUBSTITUI POR:
  Array.from(subscriptions.values()).map(s => ...)

---

## 4. Qualquer import de @types/ com .js

PROCURA (em qualquer arquivo):
  from '@types/errors.js'
  from '@types/schemas.js'

SUBSTITUI POR:
  from '../types/errors.js'
  from '../types/schemas.js'
  (ajusta o caminho relativo conforme o arquivo)

**Desenvolvido com ❤️ para trading seguro e escalável**
