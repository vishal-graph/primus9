# TatvaOps Vision

AI-powered Interior Design Platform

## Overview

TatvaOps Vision is a production-grade AI SaaS platform for interior design that supports:

- **Non-linear user flows** - Start from any stage
- **AI-heavy asynchronous processing** - No blocking UI
- **Stateful project progression** - Track design evolution
- **Modular architecture** - Scalable and maintainable

## Architecture

```
tatvaops-vision/
├── frontend/          # Next.js 14 App Router
│   ├── src/
│   │   ├── app/       # App Router pages & layouts
│   │   ├── components/# UI components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utilities & server actions
│   │   ├── providers/ # Context providers
│   │   ├── store/     # Zustand stores
│   │   └── types/     # TypeScript types
│   └── Dockerfile
│
├── backend/           # Node.js + Express (API + Webhooks)
│   ├── src/
│   │   ├── api/       # REST API routes
│   │   ├── config/    # Configuration
│   │   ├── lib/       # Core utilities (SQS, Redis, CloudWatch)
│   │   └── services/  # Business logic & notifications
│   ├── prisma/        # Database schema
│   └── Dockerfile
│
├── worker/            # Dedicated AI Worker Service
│   ├── src/
│   │   ├── handlers/  # Job handlers (Gemini calls)
│   │   ├── lib/       # Logger, shutdown manager
│   │   └── worker-pool.ts
│   └── Dockerfile
│
├── nginx/             # Reverse proxy config
├── docker-compose.yml # Local development
└── README.md
```

## Tech Stack

### Frontend (Next.js 14)
- **Framework**: Next.js 14 (App Router)
- **Server Actions**: DB mutations, queue enqueue
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **Auth**: Clerk

### Backend API (Express)
- **Runtime**: Node.js + Express
- **Purpose**: Webhooks, notifications, admin routes
- **Database**: PostgreSQL (AWS RDS) via Prisma
- **Cache**: Redis (ElastiCache)
- **Stateless**: Designed for horizontal scaling

### Worker Service
- **Purpose**: AI job processing (SQS consumer)
- **AI Provider**: Google Gemini (only service with AI secrets)
- **Features**: Idempotent, retry-safe, structured logging
- **Scaling**: Horizontal via Docker replicas

### Infrastructure (AWS)
- **Compute**: EC2 (Dockerized)
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **Queue**: SQS with Dead Letter Queues
- **Storage**: S3 (signed URLs)
- **Email**: SES
- **Monitoring**: CloudWatch Logs

### Integrations
- **AI**: Google Gemini (via worker only)
- **Payments**: Razorpay
- **Auth**: Clerk
- **WhatsApp**: MSG91

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)
- AWS account with SQS, S3, SES, CloudWatch
- Clerk account
- Razorpay account
- Google Gemini API key

### Local Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Setup

#### Frontend
```bash
cd frontend
npm install
cp env.example.txt .env.local
npm run dev
```

#### Backend API
```bash
cd backend
npm install
cp env.example.txt .env
npx prisma generate
npx prisma db push
npm run dev
```

#### Worker Service
```bash
cd worker
npm install
npm run dev
```

## Project Stages

1. **Floor Plan** - Upload and AI analysis
2. **Intent** - Design preferences
3. **Moodboard** - AI-generated designs
4. **Elevation** - Wall layouts
5. **Interior** - 3D visualizations
6. **Component** - Fine-tune elements
7. **Export** - Download package

## Key Features

### Non-Linear Flow
Users can start from any stage and navigate freely between completed stages.

### Async AI Processing (AWS SQS)
All AI operations use dedicated SQS queues:
- `floorplan-analysis-queue`
- `moodboard-generation-queue`
- `interior-view-generation-queue`
- `component-update-queue`
- `notification-queue`

Each queue has a Dead Letter Queue for failed jobs.

### Version History
Every generation is versioned via `AssetVersion` table.

### Credit System
- `UsageCredit` tracks balance per user
- `CreditLedger` records all transactions
- Credits validated before job creation

### Notifications
- **Email**: AWS SES with templates
- **WhatsApp**: MSG91 (optional)
- Rate limited per user per channel

## API Endpoints

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project

### AI Jobs
- `POST /api/jobs` - Create AI job (enqueues to SQS)
- `GET /api/jobs/:id` - Get job status (Redis cache + DB)
- `POST /api/jobs/:id/cancel` - Cancel job

### Uploads
- `POST /api/uploads/presigned-url` - Get S3 upload URL
- `POST /api/uploads/download-url` - Get S3 download URL

### Webhooks
- `POST /api/webhooks/clerk` - Clerk events
- `POST /api/webhooks/razorpay` - Payment events

### Notifications
- `POST /api/notifications/send` - Send notification (admin)
- `GET /api/notifications/logs/:userId` - Get notification logs

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (Redis, DB)

## Deployment

### Docker Build

```bash
# Build all images
docker-compose build

# Build individual services
docker build -t tatvaops-frontend ./frontend
docker build -t tatvaops-backend ./backend
docker build -t tatvaops-worker ./worker
```

### AWS EC2 Deployment

1. Set up EC2 instances with Docker
2. Configure security groups for ports 80, 443, 4000
3. Set up RDS PostgreSQL and ElastiCache Redis
4. Create SQS queues with DLQs
5. Deploy using docker-compose or ECS

### Environment Variables

See `backend/env.example.txt` for complete list including:
- AWS credentials and resource ARNs
- SQS queue URLs
- CloudWatch log groups
- MSG91 and SES configuration

## Monitoring & Alerting

### CloudWatch Integration
- Structured JSON logs pushed to CloudWatch
- Log groups: `/tatvaops/vision`, `/tatvaops/vision/worker`
- Metrics: job processing, API latency, queue depth

### Recommended Alerts
- SQS queue depth > 100
- Worker failures > 5/minute
- API 5xx errors > 10/minute
- Payment webhook errors

## Security

- All secrets via environment variables
- No AI secrets in frontend (only worker has Gemini key)
- S3 access only via signed URLs
- Payments verified server-side only
- Redis failures degrade gracefully

## TODO

- [ ] Implement full Prisma database operations
- [ ] Add image generation API integration (Stable Diffusion, DALL-E)
- [ ] Complete payment flow with Razorpay
- [ ] Add real-time job status via WebSocket/SSE
- [ ] Implement export functionality
- [ ] Add comprehensive test suite
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Add Terraform for AWS infrastructure
- [ ] Implement auto-scaling policies

## License

Proprietary - TatvaOps

