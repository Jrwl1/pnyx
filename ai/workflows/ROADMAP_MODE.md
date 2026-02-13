ROADMAP_MODE.md — Locked V1 → Milestones → Current Sprint

Goal:
Derive milestones and a current sprint from the locked V1 spec. No scope changes allowed here.

Steps:

Confirm V1_SPEC_LOCK is LOCKED.

Create/Update ai/roadmap/MILESTONES.md:

Slice V1 into vertical deliverables.

Each milestone has acceptance criteria and proof commands.

Each milestone references CAP IDs in V1_SPEC_LOCK.

Choose the next milestone and create/update ai/roadmap/SPRINT.md:

Sprint scope maps to milestone items + CAP IDs.

Sprint includes Definition of Done and required proof commands.

Set sprint status to Active.

Append WORKLOG entry with commit hash anchoring milestone + sprint setup.

Rules:

If a milestone implies a spec change, open a Change Request (do not edit V1 silently).

Reviewers can set Sprint to Ready; only Coordinator sets Done after verifying evidence.
