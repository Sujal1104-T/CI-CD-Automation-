# CI/CD Automation Platform

A modern, cloud-native CI/CD automation platform built with Next.js, Express, and Docker.

## 🚀 Features

- **Real-time Build Monitoring**: Live dashboard with automatic status updates
- **Pipeline Management**: Create and manage CI/CD pipelines
- **Docker-based Execution**: Isolated build environments
- **GitHub Webhooks**: Automatic builds on push events
- **Modern UI**: Beautiful glassmorphism design with animations
- **Queue System**: BullMQ-powered job processing with Redis

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom glassmorphism components
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js with Express
- **Queue**: BullMQ with Redis
- **Storage**: In-memory (temporary) - Database integration pending
- **Build Execution**: Docker containers
- **WebSocket**: Real-time log streaming

### Infrastructure
- **Database**: PostgreSQL (via Docker)
- **Cache/Queue**: Redis (via Docker)
- **Object Storage**: MinIO (via Docker)

## 📋 Prerequisites

- Node.js 18+
- Docker Desktop
- Git

## 🛠️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/Sujal1104-T/CI-CD-Automation-.git
cd CI-CD-Automation-
```

### 2. Start Infrastructure Services
```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (ports 9000, 9001)

### 3. Setup Backend
```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4001`

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## 🎯 Usage

1. **Access Dashboard**: Open `http://localhost:3000` in your browser
2. **Trigger Build**: Click the "+ New Pipeline" button
3. **Monitor Progress**: Watch builds update in real-time (pending → running → success)
4. **View Statistics**: See active builds and success rate

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── executor/       # Docker build execution
│   │   ├── git/            # Git operations
│   │   ├── logs/           # WebSocket logging
│   │   ├── parser/         # Pipeline YAML parser
│   │   ├── queue/          # BullMQ worker
│   │   ├── routes/         # API endpoints
│   │   ├── webhooks/       # GitHub webhook handlers
│   │   └── server.ts       # Express server
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── components/     # React components
│   │   ├── page.tsx        # Main dashboard
│   │   └── layout.tsx      # App layout
│   └── package.json
├── docker-compose.yml      # Infrastructure services
└── README.md
```

## 🔧 Configuration

### Backend Environment Variables
Create `backend/.env`:
```env
PORT=4001
DATABASE_URL=postgresql://cicd_user:cicd_password@localhost:5432/cicd_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Docker Services
- **PostgreSQL**: `localhost:5432` (user: cicd_user, password: cicd_password)
- **Redis**: `localhost:6379`
- **MinIO**: `localhost:9000` (console: `localhost:9001`)

## 🚧 Current Status

### ✅ Completed
- Frontend dashboard with real-time updates
- Backend API with build management
- Docker infrastructure setup
- GitHub webhook integration
- BullMQ job queue
- In-memory storage fallback

### 🔄 In Progress
- Database integration (Prisma compatibility issues)
- Real build execution with Docker
- WebSocket log streaming

### 📝 Planned
- User authentication
- Pipeline configuration UI
- Build artifacts storage
- Advanced scheduling
- Multi-stage pipelines

## 🐛 Known Issues

1. **Prisma Compatibility**: Currently using in-memory storage due to Prisma client generation issues in the Windows environment
2. **Data Persistence**: Build data is lost on server restart (temporary limitation)

## 🤝 Contributing

This is a personal project currently under active development.

## 📄 License

MIT

## 👤 Author

Sujal Thakur

---

**Note**: This platform is currently in MVP stage. Database integration and advanced features are planned for future releases.
