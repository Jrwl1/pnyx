# Security-sensitive path patterns (one per line)
# Used by .github/workflows/security-audit-required.yml
# Format: exact basename | dir/** | *.suffix | .env* | **/.env*
# No substring rules (e.g. no *auth*). Blank lines and # lines ignored.

.env*
**/.env*
package-lock.json
pnpm-lock.yaml
yarn.lock
.github/workflows/**
*.yml
*.yaml
Dockerfile*
docker-compose*.yml
