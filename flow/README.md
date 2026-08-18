# Tata AIG — Motor Insurance Board Demo

A self-contained HTML "board demo" (zero runtime LLM, pre-scripted content + real
recorded voice-agent audio) walking a single lead — **Vikram Rao**, renewing motor
cover on a 2022 Hyundai Creta — through the full acquisition journey: ad click →
vehicle advisory chat → policy quote → outbound follow-up call → re-engagement →
purchase (web or assisted) → activated policy.

Built by forking a proven "Kiwi Insurance" demo kit and rebranding/rewriting it with
Tata AIG's real product facts — most notably **NCB Protection**, a genuine Tata AIG
add-on that keeps a customer's No-Claim Bonus fully intact even after a claim, verified
live against tataaig.com rather than invented.

**Live demo:** https://tata-aig-insurance-demo-production.up.railway.app

## Layout

- **`03-planning/`** — agent system prompts + verbatim demo scripts
  (`TataAIG_Agent_Prompts_and_Scripts.md`), and per-agent recording scripts
  (`recording-scripts/`) for the voice recording session.
- **`04-build/tataaig-kit/`** — the actual build:
  - `gen_data.py` — source of truth for all 6 scenes' dialogue. Edit this, then
    regenerate.
  - `tataaig_constants.py` — brand/persona/product reference values.
  - `base_v9.html` — the static page shell (landing copy, CSS, layout).
  - `engine.js` — the runtime (chat/voice playback engine, channel switching).
  - `build.py` — assembles everything into the final single-file HTML. Also holds the
    editable `TAB_TITLE` / `HERO_TITLE` / `HERO_SUBTITLE` constants for the landing
    page title.
  - `audio/` — recorded voice-agent clips go here (`sc<scene>_<index>.mp3`), currently
    empty — see recording-scripts for what's needed.
  - `TataAIG_Motor_Board_Demo.html` — the built output (checked in for convenience;
    regenerate with `python3 gen_data.py && python3 build.py` after any content edit).
- **`06-deploy/`** — `Dockerfile` (nginx) + `index.html` (a copy of the built demo) for
  Railway deployment.
- **`NEXT-SESSION-PLAN.md`** — the original build runbook (kept for history).

## Rebuilding after a content or recording change

```bash
cd 04-build/tataaig-kit
python3 gen_data.py   # regenerate chat/voice/lines JSON from gen_data.py's dialogue
python3 build.py      # assemble TataAIG_Motor_Board_Demo.html
cp TataAIG_Motor_Board_Demo.html ../../06-deploy/index.html
cd ../../06-deploy
railway up --detach --service tata-aig-insurance-demo
```

## Voice agents

Six NuPlay voice agents (S1, S2, S6, S7, S8a, S8b — one per scene), workspace
`360956ac-5963-4626-98d7-01a529d26e34`, named `TataAIG-Motor-S*`. Full IDs and prompts
in `03-planning/TataAIG_Agent_Prompts_and_Scripts.md`.

Recording workflow: open each agent in the NuPlay playground, play Vikram's lines
yourself from the matching file in `03-planning/recording-scripts/`, let Ananya answer
from her fixed playback-engine prompt, pull the recording, split per turn into mono
MP3 clips named exactly as the script specifies, drop into `04-build/tataaig-kit/audio/`,
rebuild.
