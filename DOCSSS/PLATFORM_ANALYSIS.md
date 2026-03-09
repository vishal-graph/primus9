# TatvaOps Vision Platform - Comprehensive Analysis

## Executive Summary

**TatvaOps Vision** is a production-grade AI-powered SaaS platform for interior design that enables users to transform floor plans into complete design visualizations through a 7-stage workflow. The platform is built with a microservices architecture, leveraging AWS infrastructure for scalability and reliability.

---

## 1. Architecture Overview

### 1.1 System Architecture

The platform follows a **three-tier microservices architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)                     │
│  - App Router with Server Actions                           │
│  - Zustand + React Query for state management               │
│  - Clerk authentication                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend API (Express)                      │
│  - REST API endpoints                                       │
│  - Webhook handlers (Clerk, Razorpay)                      │
│  - SQS message enqueueing                                   │
│  - Credit validation & deduction                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Worker Service (AI Processing)                │
│  - SQS message consumer                                    │
│  - Google Gemini API integration                           │
│  - Image generation & processing                           │
│  - S3 storage management                                   │
└────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

#### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Material-UI
- **State Management**: Zustand + Redux Toolkit + React Query
- **Authentication**: Clerk
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form + Zod

#### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL 15 (via Prisma ORM)
- **Cache**: Redis (ElastiCache)
- **Queue**: AWS SQS
- **Storage**: AWS S3
- **Email**: AWS SES
- **Monitoring**: CloudWatch Logs
- **Payments**: Razorpay

#### Worker
- **AI Provider**: Google Gemini API
- **Image Processing**: Sharp, PDFKit
- **Queue Consumer**: AWS SQS
- **Storage**: AWS S3

### 1.3 Infrastructure (AWS)

- **Compute**: EC2 instances (Dockerized services)
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis
- **Queue**: SQS with Dead Letter Queues
- **Storage**: S3 buckets (versioned, encrypted)
- **Networking**: VPC with public/private subnets, NAT Gateway
- **Monitoring**: CloudWatch Logs & Alarms
- **Reverse Proxy**: Nginx

---

## 2. Core Features & Functionality

### 2.1 Project Stages (7-Stage Workflow)

1. **Floor Plan** (`FLOOR_PLAN`)
   - Upload floor plan (PDF/image)
   - AI analysis of room detection
   - Room geometry extraction
   - Room type classification

2. **Intent** (`INTENT`)
   - Design preference selection
   - Style choices
   - Color palette selection
   - Budget preferences

3. **Moodboard** (`MOODBOARD`)
   - AI-generated moodboards per room
   - Style-based image generation
   - Version history

4. **Elevation** (`ELEVATION`)
   - Full-floor isometric elevations
   - Architectural accuracy validation
   - Wall-by-wall elevation views (deprecated)

5. **Interior** (`INTERIOR`)
   - 3D interior visualizations
   - Multiple view angles
   - Room-specific renders

6. **Component** (`COMPONENT`)
   - Fine-tune furniture/components
   - Material selection
   - Component positioning

7. **Export** (`EXPORT`)
   - PDF generation
   - Design package download
   - Asset bundling

### 2.2 Non-Linear User Flow

- Users can start from any stage
- Navigation between completed stages is free
- Stage locking based on completion status
- URL-based stage navigation (`/project/:id?stage=moodboard`)

### 2.3 AI Job Processing

#### Job Types
- `FLOORPLAN_ANALYSIS` (5 credits)
- `MOODBOARD` (10 credits)
- `ELEVATION` (8 credits) - deprecated
- `INTERIOR` (15 credits)
- `COMPONENT_UPDATE` (3 credits)
- `INTERIOR_ISOMETRIC` (12 credits) - new standard
- `PDF_EXPORT` (0 credits)

#### Processing Flow
1. **Job Creation**: Frontend → Backend API
2. **Credit Validation**: Check user wallet balance
3. **Credit Deduction**: Deduct credits (if not TatvaOps user)
4. **SQS Enqueue**: Message sent to appropriate queue
5. **Worker Processing**: Worker consumes message, calls Gemini API
6. **Result Storage**: Generated images stored in S3
7. **Database Update**: Job status, asset URLs updated
8. **Notification**: User notified via email/WhatsApp

#### Queue Architecture
- **Queues**: `floorplan-analysis`, `moodboard-generation`, `interior-view-generation`, `component-update`, `notification`, `pdf-export`
- **Dead Letter Queues**: One per queue for failed messages
- **Visibility Timeout**: Configurable per queue
- **Retry Logic**: Built into SQS + application-level retries

### 2.4 Credit System

#### Architecture
- **UserWallet**: Main credit balance per user
- **CreditTransaction**: Finance-grade ledger (all transactions)
- **Grace Balance**: Temporary overdraft credits
- **Abuse Detection**: Regeneration throttling, rate limiting

#### Credit Costs
- Floor Plan Analysis: 5 credits
- Moodboard Generation: 10 credits
- Interior Isometric: 12 credits
- Interior View: 15 credits
- Component Update: 3 credits
- PDF Export: 0 credits (free)

#### Credit Sources
- **Welcome Bonus**: 50 credits on signup
- **Purchases**: Credit packs via Razorpay
- **Subscriptions**: Monthly credit grants
- **Refunds**: Failed jobs refund credits
- **Promotional**: Marketing campaigns

#### Special Handling
- **TatvaOps Users**: Free credits (monitored for overuse)
- **Regeneration Discount**: Lower cost for regenerations
- **Soft Limit Warnings**: Notifications at low balance

### 2.5 Payment Integration

#### Razorpay Integration
- **Payment Methods**: Credit/Debit cards, UPI, Net Banking
- **Order Creation**: Backend creates Razorpay orders
- **Webhook Handling**: Payment status updates
- **Credit Packs**: Purchasable credit bundles
- **Subscriptions**: Monthly/yearly plans

#### Payment Flow
1. User selects credit pack/subscription
2. Backend creates Razorpay order
3. Frontend opens Razorpay checkout
4. User completes payment
5. Razorpay webhook notifies backend
6. Backend verifies signature
7. Credits granted to user wallet

### 2.6 Authentication & Authorization

#### Clerk Integration
- **Authentication**: Email/password, OAuth providers
- **User Management**: Clerk handles user lifecycle
- **Webhooks**: User created/updated events
- **Session Management**: JWT-based sessions

#### Authorization
- **Project Ownership**: Users can only access their projects
- **Admin Routes**: `@tatvaops.com` email validation
- **Rate Limiting**: Per-user, per-endpoint limits

---

## 3. Database Schema Analysis

### 3.1 Core Models

#### User & Authentication
- **User**: Clerk ID, email, plan, profile data
- **UserWallet**: Credit balance, grace balance, abuse flags
- **CreditTransaction**: Complete transaction ledger

#### Projects & Rooms
- **Project**: Name, current stage, metadata (JSON)
- **Room**: Detected rooms with geometry, type, status
- **ProjectVersion**: Stage snapshots for versioning

#### Design Assets
- **RoomMoodboard**: AI-generated moodboards per room
- **IsometricFloorElevation**: Full-floor isometric views (new standard)
- **RoomElevation**: Wall-by-wall elevations (deprecated)
- **RoomInteriorView**: 3D interior renders
- **RoomComponent**: Furniture/components
- **AssetVersion**: Version tracking for all assets

#### AI Jobs
- **AIJob**: Job status, payload, results, SQS tracking
- **ExportAsset**: PDF exports and design packages

#### Payments
- **Payment**: Razorpay payment records
- **Subscription**: Active subscriptions
- **Transaction**: Payment transactions
- **CreditPack**: Purchasable credit bundles

#### Notifications
- **NotificationLog**: Email/WhatsApp delivery tracking

#### Analytics
- **CreditAnalyticsEvent**: Credit usage tracking
- **RegenerationLog**: Regeneration counts per stage
- **Feedback**: User feedback collection

### 3.2 Key Design Decisions

1. **JSON Metadata**: Flexible metadata storage for project/room data
2. **Versioning**: AssetVersion table tracks all generated assets
3. **Soft Deletes**: `deletedAt` timestamps for data retention
4. **Denormalization**: `userId` in AIJob for faster queries
5. **Idempotency**: `idempotencyKey` in CreditTransaction prevents duplicates

---

## 4. Frontend Architecture

### 4.1 Application Structure

```
frontend/src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected routes
│   │   ├── dashboard/     # Project list
│   │   ├── project/       # Project workspace
│   │   ├── credits/       # Credit purchase
│   │   └── profile/        # User profile
│   ├── (auth)/            # Auth routes
│   └── (admin)/           # Admin routes
├── components/             # Reusable UI components
├── features/               # Feature modules
│   ├── intent/            # Intent stage components
│   └── project/           # Project stage components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities & server actions
│   ├── actions/           # Server actions (DB mutations)
│   └── api-client.ts      # API client
├── providers/             # Context providers
├── store/                 # Zustand stores
└── types/                 # TypeScript types
```

### 4.2 State Management

- **Zustand**: Project state, UI state
- **Redux Toolkit**: AI job state (legacy, being migrated)
- **React Query**: Server state, caching, polling

### 4.3 Key Features

- **Server Actions**: Direct database mutations from frontend
- **Optimistic Updates**: UI updates before server confirmation
- **Real-time Polling**: Job status polling via React Query
- **Stage Navigation**: URL-based stage routing
- **Responsive Design**: Mobile-friendly layouts

---

## 5. Backend Architecture

### 5.1 API Structure

```
backend/src/
├── api/                   # Route handlers
│   ├── projects.ts       # Project CRUD
│   ├── jobs.ts           # AI job creation/status
│   ├── uploads.ts        # S3 presigned URLs
│   ├── credits.ts        # Credit management
│   ├── feedback.ts       # Feedback submission
│   ├── admin.ts          # Admin endpoints
│   └── webhooks/         # Webhook handlers
├── services/             # Business logic
│   ├── credit-service.ts # Credit operations
│   ├── payment.ts        # Razorpay integration
│   ├── notifications/   # Email/WhatsApp
│   └── ai/              # AI service abstractions
├── lib/                  # Core utilities
│   ├── sqs.ts           # SQS client
│   ├── redis.ts         # Redis client
│   └── logger.ts        # CloudWatch logging
└── middleware/           # Auth, rate limiting
```

### 5.2 Key Services

#### CreditService
- Wallet initialization
- Balance checks
- Credit deduction (idempotent)
- Grace credit handling
- Abuse detection

#### PaymentService
- Razorpay order creation
- Webhook signature verification
- Subscription management
- Credit pack purchases

#### NotificationService
- Email via AWS SES
- WhatsApp via MSG91
- Rate limiting per channel
- Template-based messages

---

## 6. Worker Service Architecture

### 6.1 Worker Pool

- **Concurrency**: Configurable (default: 2)
- **Polling**: Configurable interval per queue
- **Graceful Shutdown**: Handles in-flight jobs
- **Error Handling**: Retries with exponential backoff

### 6.2 Job Handlers

#### Floor Plan Analysis
- PDF to image conversion
- Room detection via Gemini Vision
- Geometry extraction
- Room type classification
- Graph-based room relationships

#### Moodboard Generation
- Style-based prompt building
- Gemini image generation
- Image analysis & validation
- S3 storage

#### Isometric Elevation
- Full-floor isometric generation
- Architectural accuracy validation
- Geometry validation
- Style mapping from moodboards

#### PDF Export
- Multi-page PDF generation
- Asset bundling
- S3 upload

### 6.3 Design Engine

Modular AI processing engine:
- **Common**: Gemini client, utilities
- **Floorplan**: Analysis, preprocessing, room graph
- **Moodboard**: Generation, style mapping
- **Isometric**: Elevation generation, validation
- **Elevation**: Legacy wall-by-wall (deprecated)

---

## 7. Security & Compliance

### 7.1 Security Measures

- **Authentication**: Clerk JWT tokens
- **Authorization**: Project ownership checks
- **Rate Limiting**: Per-user, per-endpoint
- **Input Validation**: Zod schemas
- **SQL Injection**: Prisma ORM protection
- **XSS Protection**: Helmet.js headers
- **CORS**: Configured origins only

### 7.2 Data Security

- **Encryption at Rest**: S3, RDS encryption
- **Encryption in Transit**: TLS/SSL
- **Secrets Management**: Environment variables
- **AI Secrets**: Only in worker service
- **S3 Access**: Signed URLs only

### 7.3 Payment Security

- **Webhook Verification**: Razorpay signature validation
- **Server-side Only**: Payment processing never in frontend
- **Idempotency**: Prevents duplicate transactions

---

## 8. Scalability & Performance

### 8.1 Horizontal Scaling

- **Stateless Services**: Backend and worker are stateless
- **Load Balancing**: Nginx reverse proxy
- **Worker Scaling**: Multiple worker replicas
- **Database**: Read replicas supported

### 8.2 Caching Strategy

- **Redis**: Job status caching, rate limiting
- **Frontend**: React Query caching
- **S3**: CDN-ready (can add CloudFront)

### 8.3 Performance Optimizations

- **Async Processing**: All AI jobs via SQS
- **Database Indexing**: Comprehensive indexes
- **Connection Pooling**: Prisma connection pool
- **Image Optimization**: Sharp for processing

---

## 9. Monitoring & Observability

### 9.1 Logging

- **Structured Logging**: Pino logger
- **CloudWatch Integration**: All logs to CloudWatch
- **Log Groups**: `/tatvaops/vision`, `/tatvaops/vision/worker`
- **Request IDs**: Track requests across services

### 9.2 Metrics

- **CloudWatch Alarms**: RDS, Redis, SQS
- **Custom Metrics**: Job processing time, credit usage
- **Error Tracking**: Failed jobs, webhook errors

### 9.3 Health Checks

- **Backend**: `/health` (basic), `/health/ready` (DB + Redis)
- **Nginx**: `/nginx-health`
- **Worker**: Graceful shutdown handling

---

## 10. Deployment

### 10.1 Docker Architecture

- **Multi-stage Builds**: Optimized images
- **Docker Compose**: Local development
- **Production**: EC2 with Docker

### 10.2 Infrastructure as Code

- **Terraform**: AWS infrastructure provisioning
- **VPC**: Multi-AZ deployment
- **RDS**: Multi-AZ PostgreSQL
- **ElastiCache**: Redis cluster

### 10.3 CI/CD

- **Manual Deployment**: Scripts in `scripts/`
- **CodeDeploy**: AWS CodeDeploy integration (configured)
- **Environment Variables**: Template files provided

---

## 11. Known Issues & Technical Debt

### 11.1 Deprecated Features

- **RoomElevation**: Replaced by IsometricFloorElevation
- **UsageCredit/CreditLedger**: Legacy models (migrating to UserWallet)

### 11.2 Incomplete Features

- **Interior Stage**: Coming soon
- **Component Stage**: Coming soon
- **Export Stage**: Coming soon
- **Real-time Updates**: WebSocket/SSE not implemented
- **Image Generation API**: Stable Diffusion/DALL-E integration pending

### 11.3 Technical Debt

- **Redux Migration**: Migrating from Redux to Zustand
- **Test Coverage**: No test suite yet
- **CI/CD Pipeline**: Manual deployment
- **Auto-scaling**: Not configured

---

## 12. Recommendations

### 12.1 Immediate Improvements

1. **Add Test Suite**: Unit tests for critical paths
2. **Implement WebSocket/SSE**: Real-time job status updates
3. **Complete Export Stage**: PDF generation functionality
4. **Add Image Generation**: Integrate Stable Diffusion/DALL-E
5. **CI/CD Pipeline**: GitHub Actions for automated deployment

### 12.2 Performance Enhancements

1. **CDN Integration**: CloudFront for S3 assets
2. **Database Optimization**: Query optimization, read replicas
3. **Caching Strategy**: More aggressive caching
4. **Image Optimization**: WebP format, lazy loading

### 12.3 Security Enhancements

1. **Rate Limiting**: More granular limits
2. **Audit Logging**: Track all sensitive operations
3. **Secrets Rotation**: Automated secret rotation
4. **WAF**: Web Application Firewall

### 12.4 Feature Enhancements

1. **Collaboration**: Multi-user projects
2. **Templates**: Pre-built design templates
3. **3D Visualization**: Enhanced 3D rendering
4. **Mobile App**: React Native app

---

## 13. Conclusion

TatvaOps Vision is a well-architected, production-ready platform with:

✅ **Strengths**:
- Clean microservices architecture
- Scalable AWS infrastructure
- Robust credit system
- Comprehensive database schema
- Good separation of concerns

⚠️ **Areas for Improvement**:
- Test coverage
- Real-time updates
- Complete feature implementation
- Automated CI/CD

The platform demonstrates solid engineering practices and is well-positioned for scaling to handle increased user load and feature expansion.

---

**Analysis Date**: 2025-01-27
**Platform Version**: 0.1.0
**Analysis Scope**: Complete codebase review
