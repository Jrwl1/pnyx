# Architectural Decision Records (ADR-lite)

Decisions proven from code, configuration, and explicit repository policy.

---

## ADR-001: Pnyx uses an opt-in repository OS contract

**Date:** 2026-03-16
**Decision:** Replace the legacy always-on `ai/` router stack with an opt-in `AGENTS.md` contract that activates protocol behavior only for `PLAN`, `DO`, `RUNSPRINT`, and `REVIEW`.
**Context:** The previous repo-level AI OS forced every fresh session through stale routing and operational doctrine before task context was clear.
**Consequences:** Normal chat is now the default. Repo actions only begin when the user explicitly enters a protocol or directly asks for repo work. Canonical planning docs now live under `docs/`.

Source: `AGENTS.md`, `docs/CANONICAL.md`, archive `C:\Users\john\aios\_archive\Pnyx-aios-legacy-2026-03-16`

---

## ADR-002: Pnyx forbids delegation and autopilot tooling but encourages direct MCP usage

**Date:** 2026-03-16
**Decision:** Do not use delegation or autopilot tooling in this repo. Prefer direct MCP tools such as `filesystem`, `git`, `github`, `context7`, `chrome-devtools`, and `playwright` when they materially improve evidence or verification.
**Context:** Delegation and autopilot guidance caused repo-level confusion and brought Windows/WSL-specific operational baggage into ordinary work. Other MCP tools remain useful and low-friction.
**Consequences:** Repo docs and helper rules point to direct MCP tools only. Delegation-specific docs and references were removed from the active repo tree.

Source: `AGENTS.md`, `docs/CANONICAL.md`, `.cursor/skills/security-auditor/SKILL.md`, `.cursor/rules/security-auditor.mdc`

---

## ADR-003: Launch auth will use email-based sessions and remove public shared-secret sign-in

**Date:** 2026-03-17
**Decision:** For the launchability milestone, replace the current public `/auth/token` shared-secret sign-in model with a launch-safe auth flow aligned to registered email identities. Moderator and admin role provisioning must move out of the public sign-in UX and into secured provisioning paths.
**Context:** The current completed feature baseline covers the core product graph, contribution flows, canonization, and trust surfaces, but public launch is still blocked by the existing sign-in model, which requires a shared server secret and explicit role selection in the browser.
**Consequences:** The next sprint prioritizes auth migration, secure role bootstrap, and frontend auth UX changes before deploy orchestration. Launchability work may add new auth/session persistence tables or flows, but must not keep the current shared-secret sign-in path as the public launch mechanism.

Source: `src/server.ts`, `frontend/src/routes/SignInPage.tsx`, `docs/ROADMAP.md`, `docs/SPRINT.md`
