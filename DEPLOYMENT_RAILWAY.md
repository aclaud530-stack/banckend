# Deriv Trading Backend - Railway Deployment Guide

## Quick Start

This backend is production-ready for deployment on Railway. Follow the steps below to deploy in minutes.

---

## Prerequisites

- Railway account: https://railway.app
- GitHub account with repository access
- Deriv OAuth2 credentials (get from https://developers.deriv.com)

---

## Step 1: Prepare Deriv Credentials

Before deployment, gather your credentials from the Deriv dashboard:

1. Visit https://developers.deriv.com
2. Create/access your OAuth2 application
3. Note the following:
   - `DERIV_CLIENT_ID`
   - `DERIV_CLIENT_SECRET`
   - `DERIV_APP_ID`
   - `DERIV_REDIRECT_URI` (will be your Railway domain + `/api/auth/callback`)

---

## Step 2: Deploy to Railway

### Option A: Using Railway CLI (Fastest)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to repository
railway link

# Deploy
railway up
```

### Option B: Using Railway Dashboard (Recommended)

1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway will auto-detect `Dockerfile` and build

---

## Step 3: Configure Environment Variables

Once deployed, add the following environment variables in Railway:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Deriv API
DERIV_CLIENT_ID=your_client_id
DERIV_CLIENT_SECRET=your_client_secret
DERIV_APP_ID=your_app_id
DERIV_API_BASE_URL=https://api.derivws.com
DERIV_WS_PUBLIC_URL=wss://api.derivws.com/trading/v1/options/ws/public
DERIV_AUTH_BASE_URL=https://auth.deriv.com/oauth2

# Frontend
FRONTEND_URL=https://yourdomain.com
FRONTEND_PROD_URL=https://yourdomain.com

# Get actual URL from Railway
DERIV_REDIRECT_URI=https://yourapp.railway.app/api/auth/callback

# Redis (Optional - if you added Redis plugin)
REDIS_HOST=redis.railway.app
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Security
JWT_SECRET=generate_strong_secret_min_32_chars
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_SUBSCRIPTIONS=100
WS_RECONNECT_MAX_ATTEMPTS=5
WS_RECONNECT_DELAY=1000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**How to add in Railway:**
1. Go to your project in Railway dashboard
2. Click the "Variables" tab
3. Add each variable or paste all at once

---

## Step 4: Add Redis (Optional but Recommended)

Redis is **optional** - the app will use in-memory cache if unavailable.

To add Redis on Railway:

1. In Railway dashboard, click "Add Plugin"
2. Select "Redis"
3. Railway automatically adds `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
4. Redeploy your service

---

## Step 5: Verify Deployment

### Check Health Endpoint

```bash
curl https://yourapp.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "environment": "production",
  "redis": "connected",
  "uptime": 1234.5
}
```

### Check Logs

In Railway dashboard:
1. Select your service
2. Click "Logs" tab
3. Look for `Server started successfully`

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Should be `production` |
| `PORT` | No | Default: 8080 (Railway sets this) |
| `HOST` | No | Default: 0.0.0.0 (required for Railway) |
| `DERIV_CLIENT_ID` | Yes | OAuth2 client ID from Deriv |
| `DERIV_CLIENT_SECRET` | Yes | OAuth2 client secret from Deriv |
| `DERIV_APP_ID` | Yes | Deriv app ID |
| `DERIV_REDIRECT_URI` | Yes | Your auth callback URL |
| `JWT_SECRET` | Yes | Min 32 chars, generate with `openssl rand -hex 32` |
| `REDIS_HOST` | No | If Redis is enabled |
| `REDIS_PORT` | No | If Redis is enabled |
| `REDIS_PASSWORD` | No | If Redis is enabled |
| `LOG_LEVEL` | No | `info` (default) or `debug` |

---

## Redis Configuration

### With Redis (Recommended for Production)

When Redis is available:
- Faster caching
- Shared state across instances
- Session persistence

### Without Redis (Fallback)

The app automatically falls back to in-memory cache if Redis is unavailable:
- Works perfectly fine
- Cache is lost on restart
- Not suitable for load-balanced deployments

---

## Monitoring & Logs

### Real-time Logs

```bash
railway logs
```

### Check Metrics

In Railway dashboard:
1. Select your service
2. Click "Deployments" tab
3. View CPU, Memory, Network

### Health Check

Railway automatically runs health checks every 30 seconds:
- Endpoint: `GET /health`
- Expected: 200 status code
- Failure: Auto-restart after 3 retries

---

## WebSocket Support

The backend supports WebSocket connections:

```javascript
const ws = new WebSocket('wss://yourapp.railway.app/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  console.log('Message:', event.data);
};
```

Features:
- ✅ Automatic heartbeat (ping/pong every 30s)
- ✅ Connection pooling
- ✅ Automatic cleanup

---

## Troubleshooting

### Deploy Fails with "Cannot find module"

**Solution:** Clear build cache and rebuild:
```bash
railway down
railway up
```

### "Redis connection refused"

**Solution:** This is OK! The app uses in-memory cache as fallback. To use Redis:
1. Add Redis plugin in Railway
2. Redeploy

### Health check fails

**Solution:** Check logs:
```bash
railway logs
```

Look for startup errors or missing environment variables.

### WebSocket connection times out

**Solution:** Check that you're using `wss://` (secure WebSocket):
```javascript
// ✅ Correct
const ws = new WebSocket('wss://yourapp.railway.app/ws');

// ❌ Wrong
const ws = new WebSocket('ws://yourapp.railway.app/ws');
```

---

## Performance Optimization

### 1. Enable Redis

Adding Redis improves performance significantly. In Railway:
1. Click "Add Plugin"
2. Select "Redis"
3. Redeploy

### 2. Monitor Memory

In Railway dashboard:
- If memory consistently > 500MB, consider scaling up
- Use `NODE_OPTIONS=--max_old_space_size=512` if needed

### 3. Rate Limiting

Current limits:
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- WebSocket: 10 requests per second

Adjust in environment variables if needed.

---

## Scaling

### Horizontal Scaling (Multiple Instances)

1. In Railway dashboard, increase replicas
2. With Redis, all instances share cache
3. Load balancer automatically distributes traffic

### Vertical Scaling

1. Click "Edit" on your service
2. Increase CPU/Memory
3. Auto-restarts with new resources

---

## Security Best Practices

✅ **Enabled:**
- Helmet security headers
- CORS configuration
- Rate limiting
- Input validation with Zod
- Non-root Docker user
- HTTPS only (enforce in frontend)

⚠️ **Additional Steps:**

1. **Generate strong JWT_SECRET:**
   ```bash
   openssl rand -hex 32
   ```

2. **Use environment variables for secrets** (never commit to git)

3. **Enable HTTPS** (Railway does this automatically)

4. **Rotate JWT_SECRET** periodically

5. **Monitor logs** for suspicious activity

---

## Continuous Deployment

### Auto-deploy on Push

Railway auto-deploys on every push to your main branch:

1. Go to your project settings
2. Ensure "Auto Deploy" is enabled
3. Every push triggers a new build

### Manual Deploy

```bash
railway up
```

---

## Rollback

If deployment fails:

1. In Railway dashboard, click "Deployments"
2. Select a previous working deployment
3. Click "Rollback"

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Deriv API Docs:** https://developers.deriv.com/docs
- **Backend Repo:** Your GitHub repository
- **Issues:** File an issue in your repository

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Build TypeScript |
| `npm start` | Start production server |
| `railway login` | Login to Railway CLI |
| `railway init` | Initialize Railway project |
| `railway up` | Deploy current branch |
| `railway logs` | View live logs |
| `railway ps` | List services |

---

## Local Testing Before Deploy

Test locally to catch errors early:

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local (from .env.production.example)
cp .env.production.example .env.local

# 3. Fill in YOUR values (Deriv credentials, etc.)
# Edit .env.local with your credentials

# 4. Start development server
npm run dev

# 5. Test health endpoint
curl http://localhost:8080/health

# 6. Test WebSocket
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080/ws');
ws.on('open', () => console.log('✓ WebSocket works'));
ws.on('error', (e) => console.log('✗ Error:', e));
"
```

---

## Production Checklist

- [ ] Deriv credentials configured
- [ ] JWT_SECRET generated and set
- [ ] CORS_ORIGIN set to your domain
- [ ] DERIV_REDIRECT_URI points to /api/auth/callback
- [ ] Redis added (optional but recommended)
- [ ] Environment variables all set
- [ ] Health endpoint returns 200
- [ ] Logs show no errors
- [ ] WebSocket endpoint responds
- [ ] Custom domain configured (optional)

---

**Deployed successfully? Great! 🎉**

Your Deriv trading backend is now live on Railway and ready for production use.
