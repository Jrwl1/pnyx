DELEGATION_PROMPT_TEMPLATES.md — Copy-paste prompts for delegation

WHAT IT DO? Ready-to-use task strings for delegate_run and delegate_autopilot so cwd, skills, and artifact shape are consistent and regression-proof.

Use with: cwd = WSL path (e.g. /mnt/c/Users/john/aios/Pnyx), skills_mode: explicit, skills: ["doc"] for doc-only tasks.

--- delegate_run: smoke test artifact ---

Task (replace <N> with next number, e.g. 3):

Create docs/_mcp_smoke_test_<N>.md with exactly 4 separate lines:
WHAT IT DO?
Timestamp: <ISO>
Working directory: <dir>
OK

(Subagent must write the actual ISO timestamp and the working directory it used.)

--- delegate_run: generic doc task ---

Task:

Create docs/<filename>.md. The file must start with a line "WHAT IT DO?" at the top, then the body. Include a timestamp and "OK" on separate lines.

(Replace <filename> and add any extra instructions as needed.)

--- delegate_autopilot: exploratory run ---

Task:

Run in the repo at cwd. Produce a short summary artifact in docs/ with: WHAT IT DO?, timestamp, and what you observed. Name it docs/_autopilot_<date>.md.

(Use when you want a single unattended run; ensure cwd is WSL path.)

--- Required parameters (reminder) ---

- cwd: always use WSL path, e.g. /mnt/c/Users/john/aios/Pnyx (convert from C:\Users\john\aios\Pnyx).
- skills_mode: explicit (avoids empty selected_skills).
- skills: ["doc"] for doc-only tasks; add others as needed.
