PROJECT_STATUS.md — Always Current (keep short)

WHAT IT DO? Single source of current repo state, mode, and next action. Keep short.

State:

Repo: V1 spec locked (amended by CR-002 and CR-003). M0, M1, M2, M3, and M4 are delivered; post-S3 lifecycle hardening remains recorded as S4. A post-S5 citizen-first Frontend V3 is now implemented in-repo and canonically documented.

Current mode: Roadmap (S5 Done; post-S5 frontend delivered outside the current milestone/sprint docs)

What is true now:

- ai/planning/V1_SPEC_LOCK.md is LOCKED (Locked at: 2025-02-15).
- ai/memory/CHANGE_REQUESTS.md includes accepted CR-002 (moderated intake) and CR-003 (CAPTCHA + fuzzy assistive matching).
- ai/roadmap/MILESTONES.md includes M4 (trust + abuse hardening) after completed M3.
- ai/roadmap/SPRINT.md marks S5 `Done` with reviewer PASS evidence and coordinator closeout checklist complete.
- Lifecycle audit gap closure work is recorded in `WORKLOG.md` as the completed S4 hardening batch.
- `frontend/` contains a React + Vite public Frontend V3 with routes `/`, `/politicians`, `/politicians/:id`, `/promises/:id`, `/methodology`, plus optional `/ops`.
- `docs/FRONTEND_V3_SPEC.md` is the implementation spec for the public frontend, and `frontend/README.md` documents local run steps plus the implemented route map.
- Frontend implementation/evidence exists in git and `WORKLOG.md`, but the canonical roadmap documents still stop at S5 backend hardening.

Next action:

- Await direction for the next milestone/sprint planning cycle, including whether frontend follow-up work becomes its own milestone/sprint or remains post-S5 maintenance.

Notes:

- Policy baseline remains: only `moderator|admin` can create canonical politicians; registered users submit proposals for moderated approval.
