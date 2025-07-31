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

- Monorepo: Clean separation of frontend (Next.js) and backend (NestJS)
- Dockerized local Postgres with Prisma ORM
- User registration & login (secure JWT authentication)
- DTO-based input validation (with class-validator, global pipe)
- Ready for role-based access, rate limiting, and robust error handling

---

## Local Development (Quick Start)

```bash
# Clone and install
git clone <this repo>
cd Pnyx
pnpm install

# Start Postgres in Docker
docker compose up -d

# Set up .env in /apps/backend/prisma/.env (see .env.example)

# Run migrations
cd apps/backend
pnpm prisma migrate dev

# Start dev servers (from project root)
pnpm dev
