# Quick Reference Guide

## Files Changed

```
✏️  src/config/index.ts              (Zod validation, Railway config)
✏️  src/server.ts                    (WebSocket server, Redis init)
✏️  src/middleware/errorHandler.ts   (asyncHandler, production errors)
✏️  src/middleware/security.ts       (Cleanup & documentation)
✏️  src/utils/logger.ts              (JSON logs in production)
✏️  src/utils/redis.ts               (Rewritten with memory fallback)
🆕 src/utils/memory-store.ts         (New: In-memory cache)

✏️  Dockerfile                        (Railway optimized)
✏️  .env.production.example           (New: Environment template)
🆕 railway.json                       (New: Railway manifest)
🆕 DEPLOYMENT_RAILWAY.md             (New: 100% deployment guide)
🆕 PRODUCTION_IMPROVEMENTS.md        (New: This summary)
```

---

## Key Concepts

### 1. Memory Store Fallback
```typescript
// Automatic fallback in redis.ts
const value = await redisGet(key);  // Tries Redis first
// If Redis down → Uses memory store
// User doesn't know the difference
```

### 2. Production Logging
```typescript
// Development: Colorized console + files
// Production: JSON to stdout only

logger.info('User logged in', { userId: '123' });
// Prod output: {"timestamp":"...","level":"INFO",...}
// Dev output:  [2025-01-15 10:30:00] INFO: User logged in ...
```

### 3. WebSocket Heartbeat
```typescript
// Automatic every 30 seconds
const pingInterval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.ping();  // Client must respond with pong
  }
}, config.websocket.heartbeatInterval);
```

### 4. Graceful Shutdown
```typescript
// On SIGTERM/SIGINT:
1. Close WebSocket server (stop new connections)
2. Close HTTP server (finish existing requests)
3. Close Redis connection
4. Clean up memory store
5. Exit (max 30 seconds total)
```

---

## Commands

```bash
# Development
npm run dev              # Hot-reload watch mode

# Production
npm run build            # Compile TypeScript → dist/
npm start                # Start from dist/

# Docker
docker build -t backend .
docker run -p 8080:8080 -e PORT=8080 backend

# Railway
railway login            # Authenticate
railway init             # Create project
railway up               # Deploy
railway logs             # View logs
railway env list         # List variables
```

---

## Testing Checklist

Before deploying:

- [ ] `npm run build` completes successfully
- [ ] `npm start` runs without errors
- [ ] `curl http://localhost:8080/health` returns 200
- [ ] WebSocket connects: `ws://localhost:8080/ws`
- [ ] Environment variables are set
- [ ] No console errors in dev mode

---

## Environment Variable Tips

```bash
# Generate secure JWT_SECRET
openssl rand -hex 32

# Or using Node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test env loading
node -e "require('dotenv').config(); console.log(process.env.PORT)"
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| `Cannot find module` | Incomplete build | `npm run build && npm start` |
| `Port already in use` | Another process on port | `lsof -i :8080 \| kill -9 <PID>` |
| `Redis connection refused` | Redis not running | That's OK! Memory fallback works |
| `Health check fails` | Endpoint down | Check logs: `npm run dev` |
| `WebSocket times out` | Using `ws://` instead of `wss://` | Use secure WebSocket in prod |

---

## API Endpoints

```
GET  /health              ← Health check (Railway monitoring)
GET  /api/auth/*          ← Authentication routes
GET  /api/accounts/*      ← Account management
GET  /api/trading/*       ← Trading operations
WS   /ws                  ← WebSocket connection
```

---

## Redis vs Memory Store

| Feature | Redis | Memory |
|---------|-------|--------|
| **Persistence** | ✓ Yes | ✗ Lost on restart |
| **Multi-instance** | ✓ Shared | ✗ Per-instance only |
| **Performance** | ✓ Fast | ✗ Slightly slower |
| **Dependency** | External | None |
| **Reliability** | ✓ Robust | ✓ Simple |

**For Railway:** Either works fine. Redis recommended for production.

---

## Configuration Files

### railway.json
```json
{
  "build": { "builder": "dockerfile" },
  "deploy": { "startCommand": "npm run start" }
}
```

### .env.production.example
- Copy to `.env.production` locally
- Set all values from Deriv dashboard
- Upload to Railway dashboard

---

## Monitoring

**Railway Dashboard:**
1. Logs tab → Real-time server output
2. Metrics tab → CPU, Memory, Network
3. Deployments tab → Version history

**Logs to watch for:**
```
✓ "Server started successfully"
✓ "Redis connected successfully" (or "using memory")
✓ "Request completed" (for each API call)
✗ "Error occurred" or "Unhandled error"
```

---

## Performance Tuning

```bash
# Increase Node memory if needed
NODE_OPTIONS=--max_old_space_size=512 npm start

# Increase rate limits if needed
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_WINDOW_MS=900000

# WebSocket tuning
WS_HEARTBEAT_INTERVAL=30000      # Ping every 30s
WS_MAX_SUBSCRIPTIONS=100         # Max 100 per connection
```

---

## Security Checklist

- ✅ Helmet security headers enabled
- ✅ CORS configured properly
- ✅ Rate limiting on auth endpoints
- ✅ Input validation with Zod
- ✅ No stack traces in production
- ✅ Non-root Docker user
- ⚠️ USE HTTPS (Railway handles this)
- ⚠️ Rotate JWT_SECRET periodically
- ⚠️ Keep dependencies updated: `npm audit`

---

## Deployment Walkthrough

```bash
# 1. Test locally
npm run build && npm start

# 2. Push to GitHub
git add .
git commit -m "Production ready"
git push

# 3. Railway deploys automatically
# OR manual: railway up

# 4. Configure variables
# In Railway dashboard → Variables tab

# 5. Verify
curl https://yourapp.railway.app/health

# 6. Monitor
railway logs
```

---

## Troubleshooting Commands

```bash
# Check if port is listening
lsof -i :8080

# Check Node version
node --version

# Check npm dependencies
npm list

# Audit security
npm audit

# Format code
npm run format

# Lint code
npm run lint

# Clear cache
rm -rf dist node_modules
npm install
npm run build
```

---

## Resources

- **Railway Docs:** https://docs.railway.app
- **Node.js Guide:** https://nodejs.org/docs
- **Express.js Docs:** https://expressjs.com
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Deriv API Docs:** In your project root (Deriv documentation)

---

## Quick Deploy Commands

```bash
# One-line: Build and push
npm run build && git add . && git commit -m "deploy" && git push

# Railway CLI
railway up

# Check deployment
railway logs --tail 100
```

---

**Need help? Check `DEPLOYMENT_RAILWAY.md` for detailed guide!**
