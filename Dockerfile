# =========================
# Stage 1: Build
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia ficheiros de dependências
COPY package.json pnpm-lock.yaml ./

# Instala TODAS as dependências (inclui dev para TypeScript)
RUN pnpm install

# Copia o resto do projeto
COPY . .

# Build do TypeScript
RUN pnpm run build


# =========================
# Stage 2: Runtime
# =========================
FROM node:18-alpine

WORKDIR /app

# Ferramentas básicas
RUN apk add --no-cache dumb-init curl

# Instala pnpm
RUN npm install -g pnpm

# Copia dependências
COPY package.json pnpm-lock.yaml ./

# Instala apenas produção
RUN pnpm install --prod && pnpm store prune

# Copia build gerado
COPY --from=builder /app/dist ./dist

# Cria user seguro
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Porta padrão (Railway vai sobrescrever com PORT env)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Melhor gestão de processos
ENTRYPOINT ["dumb-init", "--"]

# Start da aplicação
CMD ["node", "dist/server.js"]
