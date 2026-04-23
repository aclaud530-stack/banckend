# 🚀 Deployment Guide

Guia completo para fazer deploy do backend em produção.

## 📋 Pré-requisitos

- ✅ Domínio próprio (ex: api.yourdomain.com)
- ✅ Certificado SSL/TLS
- ✅ Acesso a um servidor ou PaaS (AWS, DigitalOcean, Render, Railway)
- ✅ Redis configurado
- ✅ PM2 ou Docker instalado
- ✅ Node.js 18+ no servidor

---

## 🏭 Opção 1: Deploy em Servidor VPS (AWS EC2, DigitalOcean, Linode)

### 1. Preparar Servidor
```bash
# Ubuntu 20.04+
sudo apt-get update
sudo apt-get install -y nodejs npm nginx certbot

# Instalar Node 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar pnpm
npm install -g pnpm pm2

# Criar usuário para app
sudo useradd -m -s /bin/bash deriv-app
```

### 2. Clonar Repositório
```bash
cd /home/deriv-app
git clone <seu-repo> backend
cd backend
pnpm install

# Compilar
pnpm build
```

### 3. Configurar Variáveis de Ambiente
```bash
nano .env
```

Cole (com suas credenciais):
```env
NODE_ENV=production
PORT=3001
HOST=127.0.0.1

DERIV_CLIENT_ID=seu_client_id
DERIV_CLIENT_SECRET=seu_client_secret
DERIV_REDIRECT_URI=https://api.yourdomain.com/api/auth/callback

FRONTEND_URL=https://yourdomain.com
FRONTEND_PROD_URL=https://yourdomain.com

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=gerar_uma_secret_segura_aqui

CORS_ORIGIN=https://yourdomain.com

LOG_LEVEL=info
LOG_FILE=/var/log/deriv-api/app.log
```

### 4. Criar Diretório de Logs
```bash
sudo mkdir -p /var/log/deriv-api
sudo chown deriv-app:deriv-app /var/log/deriv-api
```

### 5. Iniciar com PM2
```bash
cd /home/deriv-app/backend

# Inicie a aplicação
pm2 start ecosystem.config.js --env production

# Salve configuração
pm2 save

# Configure auto-start na reboot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/local/bin/pm2 startup systemd -u deriv-app --hp /home/deriv-app
```

### 6. Configurar Nginx (Reverse Proxy)
```bash
sudo nano /etc/nginx/sites-available/api
```

Cole:
```nginx
upstream api_upstream {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificates (use Certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;

    # Proxy Settings
    location / {
        proxy_pass http://api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /api/trading {
        proxy_pass http://api_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 7. Ativar Nginx
```bash
sudo ln -s /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL Certificate (Certbot)
```bash
sudo certbot certonly --nginx -d api.yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

### 9. Monitorar
```bash
# Ver status
pm2 status

# Ver logs
pm2 logs

# Monitorar em tempo real
pm2 monit
```

---

## 🐳 Opção 2: Deploy com Docker (Recomendado)

### 1. Build da Imagem
```bash
docker build -t deriv-api:latest .
```

### 2. Deploy em Docker Compose
```bash
docker-compose -f docker-compose.yml up -d
```

### 3. Nginx em Container (Alternativa)
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    image: deriv-api:latest
    expose:
      - 3001
    environment:
      NODE_ENV: production
    env_file:
      - .env.production
    networks:
      - prod-network

  redis:
    image: redis:7-alpine
    expose:
      - 6379
    networks:
      - prod-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - api
    networks:
      - prod-network

networks:
  prod-network:
```

---

## ☁️ Opção 3: Deploy em PaaS (Railway, Render, Heroku)

### Railway.app

1. **Conecte seu repositório**
   - Login em railway.app
   - Conecte seu GitHub

2. **Configure variáveis**
   ```
   Variables → Add
   NODE_ENV = production
   DERIV_CLIENT_ID = ...
   ...
   ```

3. **Deploy**
   - Railway faz deploy automaticamente em cada push

### Render.com

1. **Crie novo Web Service**
   - Connect GitHub repository
   - Build command: `pnpm build`
   - Start command: `node dist/server.js`

2. **Configure Environment Variables**
   - NODE_ENV: production
   - Todas as variáveis em .env

3. **Deploy**
   - Render faz deploy automaticamente

### Vercel (Node.js Function)

1. **Crie `vercel.json`**
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "functions": {
    "api/**": {
      "runtime": "nodejs18.x"
    }
  }
}
```

2. **Deploy**
```bash
vercel --prod
```

---

## 📊 Monitoramento em Produção

### Logs com PM2+
```bash
pm2 plus
pm2 connect  # Conecte sua conta
pm2 start ecosystem.config.js --env production
```

### Monitoramento com Sentry
```bash
npm install @sentry/node

# Adicione ao server.ts
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

### Health Checks
```bash
# Verificar periodicamente
curl https://api.yourdomain.com/health

# Configurar em PM2
pm2 web  # Dashboard web
```

---

## 🔒 Segurança em Produção

### 1. Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Fail2Ban (Proteção DDoS)
```bash
sudo apt-get install -y fail2ban

sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true
```

### 3. Certificados SSL Automáticos
```bash
# Renewal automático
sudo systemctl enable certbot.timer
```

---

## 🚨 Troubleshooting Deployment

### Porta 3001 Não Responde
```bash
# Verificar se está ouvindo
netstat -tlnp | grep 3001

# Testar internamente
curl http://localhost:3001/health
```

### Nginx não redireciona para API
```bash
# Verificar erro
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

### Redis não conecta
```bash
# Verificar se está rodando
redis-cli ping
# Retorna: PONG

# Se não estiver
redis-server
```

### Certificado SSL Expirado
```bash
# Renovar
sudo certbot renew
```

---

## 📈 Scaling (Múltiplas Instâncias)

### Com PM2
```bash
pm2 start ecosystem.config.js --env production -i max
```

### Com Docker Swarm
```bash
docker swarm init
docker service create --name api --replicas 3 deriv-api:latest
```

### Com Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deriv-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: deriv-api
  template:
    metadata:
      labels:
        app: deriv-api
    spec:
      containers:
      - name: api
        image: deriv-api:latest
        ports:
        - containerPort: 3001
```

---

## 📊 Checklist Final

- [ ] Domínio aponta para servidor (DNS)
- [ ] SSL certificado instalado e válido
- [ ] .env com credenciais de produção
- [ ] Redis rodando e acessível
- [ ] PM2/Docker inicializa corretamente
- [ ] Health endpoint retorna 200
- [ ] Logs sendo salvos corretamente
- [ ] Firewall configurado
- [ ] Backups agendados
- [ ] Monitoramento ativo
- [ ] Rate limits apropriados

---

**Deployment concluído com sucesso! 🎉**

Para suporte: [Deriv API Docs](https://developers.deriv.com/)
