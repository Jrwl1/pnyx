# PNYX

> Crowdsourced Political Accountability Platform — MVP

**Tech Stack:**  
- Frontend: Next.js (TypeScript, TailwindCSS)  
- Backend: NestJS (TypeScript)  
- Database: PostgreSQL (Dockerized, Prisma ORM)  
- Auth: JWT (access tokens)  
- Infra: pnpm workspaces, Docker, VSCode  

---

## MVP Features Implemented

- Monorepo: frontend (Next.js) and backend (NestJS)  
- Dockerized local Postgres with Prisma ORM  
- User registration & login (secure JWT auth)  
- DTO-based input validation (class-validator + global pipe)  
- Modularized backend into feature modules (Auth, Politicians, Statements)  
- Global rate limiting (20 req/min) via @nestjs/throttler for now  
- HTTP request logging middleware (`LoggerMiddleware`)  
- Security headers with Helmet + CORS setup  
- Ready for role-based access, full error handling, and testing   

---

## Next up

- Complete RBAC enforcement and role management UI  
- Expand structured logging with centralized log aggregation  
- Write full E2E test coverage for core user and statement flows  
- Implement robust error handling and monitoring/alerts

---

## Local Development (Quick Start)

```bash
# clone & install
git clone <this repo>
cd Pnyx
pnpm install

# start Postgres
docker compose up -d

# prisma .env (in apps/backend/prisma/.env)
# see .env.example

# run migrations
cd apps/backend
pnpm prisma migrate dev

# back at project root, start both servers
pnpm dev
