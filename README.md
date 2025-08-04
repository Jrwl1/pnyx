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

- Monorepo: clean split between frontend (Next.js) and backend (NestJS)  
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
-Add structured service-level logging (NestJS Logger or Pino)
-Implement role-based permissions & RBAC
-Harden CORS / security headers for production
-Write E2E tests for core flows (auth, statements)
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
