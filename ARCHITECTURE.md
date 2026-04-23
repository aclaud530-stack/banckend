# Arquitetura e Boas Práticas

## 🏗️ Arquitetura

### Camadas

```
┌─────────────────────────────────────────┐
│          API Routes (Express)           │
│  (auth, accounts, trading)              │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│        Service Layer                     │
│  (AuthService, DerivAPIService,         │
│   TradingService)                       │
└────────────────────┬────────────────────┘
                     │
┌────────────────────▼────────────────────┐
│        External APIs                     │
│  (Deriv REST API, WebSocket)            │
└─────────────────────────────────────────┘
```

### Fluxo de Requisição

```
1. Request entra → 2. Security Middleware
                        (Helmet, CORS, Rate Limit)
                        ↓
                   3. Request Logger
                        ↓
                   4. Validation (Zod)
                        ↓
                   5. Route Handler
                        ↓
                   6. Service Layer (Lógica)
                        ↓
                   7. External API Call
                        ↓
                   8. Response
                        ↓
                   9. Error Handler (se erro)
```

## 🔐 Segurança em Camadas

### 1. Transport Layer
```
✅ HTTPS em produção (usar reverse proxy como Nginx)
✅ TLS 1.2+ obrigatório
```

### 2. Application Layer
```
✅ Helmet - Headers de segurança
✅ CORS - Validação de origem
✅ Rate Limiting - Proteção DDoS
✅ Input Validation - Zod schemas
```

### 3. Authentication
```
✅ OAuth2 com PKCE (não OAuth 2.0 Code Flow simples)
✅ State validation para CSRF
✅ Bearer tokens armazenados seguramente
```

### 4. Error Handling
```
✅ Sem stack traces em produção
✅ Mensagens de erro genéricas
✅ Logging estruturado de erros
```

## 📊 Padrões de Código

### Service Pattern
```typescript
// ✅ Bom
export class AuthService {
  static generatePKCE(): PKCEPair { }
  static buildAuthorizationUrl(): string { }
  static exchangeCodeForToken(): Promise<TokenResponse> { }
}

// ❌ Ruim
function generatePKCE() { }
function buildAuthUrl() { }
async function exchangeToken() { }
```

### Error Handling
```typescript
// ✅ Bom
try {
  // operação
} catch (error) {
  logger.error('Operation failed', { error });
  throw new AppError(message, 500);
}

// ❌ Ruim
try {
  // operação
} catch (error) {
  console.log(error);
  res.status(500).send('Error');
}
```

### Async Operations
```typescript
// ✅ Bom
app.use(express.json());
import 'express-async-errors';

router.get('/', async (req, res, next) => {
  // Errors automatically caught by middleware
  const data = await service.getData();
  res.json(data);
});

// ❌ Ruim
router.get('/', async (req, res) => {
  try {
    const data = await service.getData();
    res.json(data);
  } catch (error) {
    res.status(500).json(error);
  }
});
```

## 🚀 Performance

### Otimizações Implementadas

```typescript
1. Connection Pooling
   - Redis connections reutilizadas
   - HTTP keep-alive ativado

2. Caching
   - Resultados em memória (future: Redis)
   - TTL baseado em requisito

3. Message Queuing
   - Fila de mensagens WebSocket
   - Processamento assíncrono

4. Compression
   - gzip compression on responses
   - JSON payloads minimizados
```

### WebSocket Performance

```typescript
1. Heartbeat Management
   - Ping a cada 30s (configurável)
   - Timeout de 5s
   - Reconexão automática

2. Subscription Limits
   - Máximo 100 por conexão
   - Cleanup de subscrições expiradas
   - Monitoramento de status

3. Message Queue
   - Buffering durante desconexão
   - Flush on reconnect
   - Evita perda de dados
```

## 📈 Escalabilidade

### Horizontal Scaling
```
┌─────────────────────────────────────┐
│          Load Balancer              │
│       (Nginx / HAProxy)             │
└─────────┬─────────────┬─────────────┘
          │             │
    ┌─────▼──┐      ┌───▼─────┐
    │Instance│      │Instance │
    │   1    │      │   2     │
    └─────┬──┘      └───┬─────┘
          │             │
          └─────┬───────┘
                │
        ┌───────▼────────┐
        │    Redis       │
        │  Pub/Sub       │
        └────────────────┘
```

### PM2 Cluster Mode
```bash
# Cada instância em processo separado
# Load balancing automático entre instâncias
# Compartilhamento de estado via Redis
# Graceful restart de uma instância por vez
```

## 🧪 Testing Strategy (TODO)

### Unit Tests
```typescript
// tests/unit/services/auth.service.test.ts
describe('AuthService', () => {
  test('generatePKCE should return valid pair', () => {
    const pkce = AuthService.generatePKCE();
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.codeChallenge).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// tests/integration/api/auth.test.ts
describe('Auth API', () => {
  test('GET /api/auth/login should return authUrl', async () => {
    const res = await request(app).get('/api/auth/login');
    expect(res.status).toBe(200);
    expect(res.body.authUrl).toBeDefined();
  });
});
```

## 📝 Logging Best Practices

### O que logar
```
✅ Início e fim de operações críticas
✅ Errors com contexto completo
✅ Métricas de performance
✅ Eventos de segurança
✅ Mudanças de estado importantes
```

### O que NÃO logar
```
❌ Senhas ou tokens
❌ Dados pessoais (exceto user IDs)
❌ Informações sensíveis da API
❌ Stack traces em produção
```

### Exemplo
```typescript
// ✅ Bom
logger.info('User authenticated', { 
  userId: user.id,  // OK
  expiresIn: 3600
});

// ❌ Ruim
logger.info('User authenticated', {
  password: 'secret123',  // Nunca!
  token: accessToken,      // Nunca!
});
```

## 🔄 Deployment Checklist

- [ ] Variáveis de ambiente configuradas
- [ ] CORS configurado corretamente
- [ ] HTTPS ativado
- [ ] Rate limits apropriados
- [ ] Logging configurado
- [ ] Database backups configurados
- [ ] Monitoring ativado
- [ ] Alertas configurados
- [ ] Load balancer configurado
- [ ] Health checks funcionando

## 🚨 Incident Response

### WebSocket Desconecta
```
1. Logger: WARN "WebSocket desconectado"
2. Automático: Reconexão com exponential backoff
3. Cliente: Notificado via evento 'disconnected'
4. Retry: Até 5 tentativas (configurável)
```

### Rate Limit Atingido
```
1. Response: 429 Too Many Requests
2. Header: Retry-After indicando tempo de espera
3. Logger: WARN com IP/token que excedeu
4. Monitoramento: Alerta se padrão suspeito
```

### Token Expirado
```
1. Response: 401 Unauthorized
2. Cliente: Deve fazer novo login
3. Lógica: Validação antes de cada requisição
4. Refresh: (TODO) Implementar refresh token flow
```

## 🛠️ Maintenance

### Limpeza de Dados
```bash
# Limpar logs antigos
find logs/ -type f -mtime +30 -delete

# Limpar cache
rm -rf .cache/

# Dependências vulneráveis
npm audit fix
```

### Monitoring
```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs

# Monitoramento com PM2+
pm2 plus
```

## 📚 Referências

- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 with PKCE](https://tools.ietf.org/html/rfc7636)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Última atualização:** 2024-04-23
