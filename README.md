# 🏨 SmartHostel Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

> **A comprehensive, next-generation platform designed to digitize, streamline, and automate hostel management operations.** 
> Featuring real-time updates, microservice architecture, and integrated AI capabilities.

🌍 **Live Demo:** [smarthostel-production-f1c8.up.railway.app](https://smarthostel-production-f1c8.up.railway.app)

---

## ✨ Key Features

*   🔐 **Role-Based Access Control:** Dedicated portals tailored for Admins, Committee members, and Students.
*   📱 **QR-Powered Attendance:** High-frequency, real-time meal and attendance tracking via an isolated microservice.
*   🧠 **AI Chat & Sentiment Analysis:** Intelligent chat assistant and automated sentiment tracking for complaints and feedback.
*   💳 **Rebates & Payments:** Built-in Razorpay integration for seamless handling of hostel fees and mess rebates.
*   ⚡ **Real-Time Infrastructure:** Instant alerts powered by Socket.io and an asynchronous Redis-backed email notification worker.
*   📊 **Analytics & Dashboards:** Beautiful, interactive visual data representations using Recharts.
*   🔑 **Omni-Auth:** Secure sign-in via Google OAuth 2.0 alongside traditional JWT authentication.
*   📦 **Inventory & Mess Management:** Comprehensive tracking of hostel assets, stock levels, and dynamic mess menus.

---

## 🛠️ The Tech Stack

### Frontend Architecture
Built for speed, type-safety, and interactive user experiences.

[![Frontend Skills](https://skillicons.dev/icons?i=react,ts,vite,tailwind,zustand)](https://skillicons.dev)

*   **Core:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS v4, Lucide React
*   **State & Fetching:** Zustand, TanStack React Query v5
*   **Routing & Forms:** React Router DOM v6, React Hook Form, Zod
*   **Utilities:** Socket.io-client, Recharts, html5-qrcode

### Core Backend API
A robust, high-performance runtime handling core business logic.

[![Backend Skills](https://skillicons.dev/icons?i=nodejs,express,ts,postgres,prisma,redis)](https://skillicons.dev)

*   **Core:** Node.js, Express 5, TypeScript
*   **Data Layer:** PostgreSQL 16, Prisma ORM v6
*   **Caching & Pub/Sub:** Redis (ioRedis)
*   **Security & Auth:** JWT, bcryptjs, Google OAuth, Helmet, Rate Limiting
*   **Integrations:** Razorpay, Socket.io, Nodemailer, node-cron

### DevOps & Infrastructure
Containerized for seamless deployment and isolated failure domains.

[![DevOps Skills](https://skillicons.dev/icons?i=docker,nginx,github)](https://skillicons.dev)

*   **Containers:** Docker & Docker Compose
*   **Cloud/Deployment:** Railway, Nginx (Static Serving)

---

## 🏗️ Microservices Architecture

To ensure high availability and decoupled scaling, SmartHostel breaks out critical background tasks from the main API.

1.  **Attendance Service (`Port 5002`)**
    *   *Purpose:* Isolated high-frequency meal/attendance marking with its own failure domain.
    *   *Security:* RBAC (Committee/Warden/Admin) with ABAC preventing self-marking.
2.  **Notification Worker (`No Exposed Port`)**
    *   *Purpose:* Decoupled async email delivery via Nodemailer. Subscribes to a Redis `notifications:email` pub/sub channel. Keeps the main API fast and crash-resilient.

---

## 📁 Project Structure

```text
SmartHostel/
├── client/                   # React + Vite frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── stores/           # Zustand state stores
│   │   └── lib/              # API clients, utilities
│   └── ...
├── server/                   # Node.js + Express core API
│   └── src/
│       ├── controllers/      # Route handlers
│       ├── routes/           # API route definitions
│       ├── services/         # Business logic
│       ├── sockets/          # Socket.io event handlers
│       └── jobs/             # Background cron jobs
├── services/
│   ├── attendance-service/   # Isolated attendance microservice
│   └── notification-worker/  # Async Redis pub/sub email worker
└── docker-compose.yml        # Orchestrates the entire ecosystem

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) and Docker Compose

### Environment Setup

1. **Clone the repository.**
2. **Setup environment variables:**
   - Copy `server/.env.example` to `server/.env` and update the values (Database URL, JWT secrets, Razorpay keys, Google OAuth credentials, SMTP settings).
   - Copy `client/.env.example` to `client/.env`.

### Running with Docker (Recommended)

The easiest way to get the entire stack running is via Docker Compose.

```bash
# Start all services (PostgreSQL, Redis, Backend, Attendance Service, Notification Worker, Frontend)
docker-compose up -d --build
```

| Service              | URL                        |
|----------------------|----------------------------|
| Frontend             | http://localhost:3000       |
| Backend API          | http://localhost:5001       |
| Attendance Service   | http://localhost:5002       |
| Notification Worker  | (no port — Redis worker)   |

### Running Locally (Without Docker)

#### 1. Database & Redis
Ensure PostgreSQL and Redis are running locally or use Docker to run just the databases:
```bash
docker-compose up -d postgres redis
```

#### 2. Backend Server
```bash
cd server
npm install
npm run db:generate
npm run db:migrate
npm run db:seed    # Optional: seed initial data
npm run dev
```

#### 3. Frontend Client
```bash
cd client
npm install
npm run dev
```

#### 4. Attendance Microservice
```bash
cd services/attendance-service
npm install
npm run dev
```

#### 5. Notification Worker
```bash
cd services/notification-worker
npm install
npm run dev
```

## License
This project is licensed under the MIT License - see the LICENSE file for details.
