# WHAT IT DO? V1 threat model: trust boundaries, assets, attackers, mitigations.

## Trust boundaries
- **Client → API**: Untrusted (browser, CLI, scripts)
- **API → DB**: Trusted (same process)
- **Auth issuer**: Trusted when caller holds JWT_SECRET

## Assets
- Politician/statement data (integrity, availability)
- User identity (auth tokens)
- JWT_SECRET, DB file

## Attacker capabilities
| Capability | Mitigation |
|------------|------------|
| Spoof role/user via headers | **Fixed**: JWT-only auth; x-role/x-user-id ignored |
| Mint tokens without secret | POST /auth/token requires secret === JWT_SECRET |
| SQL injection | Parameterized queries (better-sqlite3) |
| Unbounded write load | Rate limits (S0-T10, not yet implemented) |
| Read sensitive data | Role guards; list visibility per INV-006 |
| Tamper with audit trail | Immutable revision_audits; no UPDATE/DELETE |

## Residual risks
- **Token issuer trust**: Anyone with JWT_SECRET can mint tokens. Protect secret; consider separate auth service.
- **No rate limits**: DoS possible until S0-T10.
- **DB file access**: SQLite file readable by process owner; ensure file permissions.
