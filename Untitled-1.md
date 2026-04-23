backend/
├── 📝 Documentação (5 arquivos)
│   ├── README.md              ← Documentação completa
│   ├── QUICKSTART.md          ← Setup em 5 minutos
│   ├── ARCHITECTURE.md        ← Padrões e boas práticas
│   ├── DEPLOYMENT.md          ← 3 estratégias deploy
│   ├── PROJECT_STRUCTURE.md   ← Referência rápida
│   └── SUMMARY.md             ← Este resumo
│
├── 💻 Código-Fonte (src/)
│   ├── config/                → Configuração centralizada
│   ├── middleware/            → Segurança + Erros
│   ├── routes/               → Auth, Accounts, Trading
│   ├── services/             → OAuth2, Deriv API, Trading
│   ├── websocket/            → Manager robusto
│   ├── types/                → Schemas Zod + Errors
│   ├── utils/                → Logger Winston
│   └── server.ts             → Entrada principal
│
├── 🐳 Docker & Deployment
│   ├── Dockerfile            → Multi-stage build
│   ├── docker-compose.yml    → Redis + API
│   ├── ecosystem.config.js   → PM2 cluster
│   └── .dockerignore
│
└── ⚙️ Configuração
    ├── package.json          ← Todas as dependências
    ├── tsconfig.json
    ├── .env.example
    ├── .env.development
    ├── .env.production
    └── .gitignore

# 🚧 Segurança e Performance
# Transport  → HTTPS/TLS (via nginx)
# Network    → Helmet, CORS, Firewall
# DDoS       → Rate limiting
# Input      → Zod validation
# Auth       → OAuth2 + PKCE
# Errors     → Global error handler