# NuPlay agent scripts — Riya & Ananya

Read-only backup of the actual DSL scripts (`sop_content`) that drive the two live NuPlay
voice agents this demo calls. **The platform is the real source of truth** — these files are
a GitHub-backed copy for reference/version history, not something the app reads directly.

- `riya/` — Lead Qualifier / appointment-confirmation agent (outbound). `agent_id`
  `fbad08b6-4f3f-48ec-ac6b-056c6ba536fe`, workspace `58a091b8-1254-4b6c-bbac-29da582c34f5`.
- `ananya/` — Smart Coach / pitch-practice agent (inbound). `agent_id`
  `a6874aeb-8061-43e7-bb0b-7515dbfa115a`, same workspace.

Each folder's `sop-content.txt` matches what's currently **published and live** on the
platform (last synced 2026-08-18). Each `CHANGELOG.md` documents the version history and
reasoning behind every change, including edits made directly through the NuPlay dashboard
rather than through this repo.

If you edit an agent's script on the platform directly, re-sync these files afterward so
they don't drift — fetch the live config and overwrite `sop-content.txt`, don't hand-edit
this copy expecting it to push anywhere automatically.
