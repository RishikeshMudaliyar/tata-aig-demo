# Smart Coach (Ananya) — `sop_content` changelog

## v1 — 2026-08-17

**Status:** Authored, self-reviewed (Phase 0–7 complete, all gates PASS), reviewed by operator, and **PUSHED LIVE to the draft** on 2026-08-17. Confirmed via `GET .../a6874aeb-8061-43e7-bb0b-7515dbfa115a-draft`: `sop_content`, `opening_dialogue`, `closing_dialogue` all present as authored, `cookbook_revision: raven:r0.2.0` intact.

**Correction made during operator review (before push):** `welcome_message` was changed from the originally-drafted `""` to `"Hello?"`, after checking Bajaj's own live Meera agent (`09183445-7988-496f-b28a-d4e8e426a3d9`, workspace `3e0cd394-...`) and finding it uses `opening_dialogue: "Hello?"` for the identical silent-start/salesperson-speaks-first scenario — not an empty string. This resolves "Needs human input" item 1 below with a verified answer instead of an assumption.

**What:** First authored `sop_content` for the agent, re-theming Bajaj Life's proven six-exchange Smart Coach mechanic (`bajaj-v7-sop-content-reference.txt`) to a motor/NCB Protection sale per `uploads/tata-aig-requirement.md`. Replaces the scaffold's `PLACEHOLDER` SOP text, welcome_message, and closing_message.

**Root cause / why authored this way:** The scaffold step (`va-agent-scaffold`) only produces the persona/guardrails/language wrapper — `sop.sop_content` at that point is a literal placeholder string, and the platform does not auto-compile it into a `flow{}`/`intents{}` state machine (per `knowledge/nuplay-gotchas.md` #17). This phase's job was to hand-author the actual state machine.

**Fix / content:**
- 11-state `flow{}`: silent-start `$$entry` (salesperson speaks first) → 6-exchange objection ladder (existing-insurer loyalty → NCB-loss fear → price → "think about it" stall → agrees to next step) → out-of-character `assessment()`/`deliver_assessment()` pair, plus `deflect_early_close()`, `$$objection nudge()` (3-step escalating disengagement for off-script turns), and `abusive_close()`.
- `rules{}` with 3 named sub-blocks: `voice` (Devanagari/Roman-script keep-list, female verb forms, आप-only address, Indian numbering), `script_discipline` (answer-only-what's-asked, earned-doubt-only, grudging concessions, real fillers, no-repeat-opener), `assessment_rules` (quote-their-words, priority-ordered single gap, verbatim reusable sentence, 1-10 rubric, under-60s clinical tone, no exclamation marks, never reveal rubric mid-roleplay).
- `intents{}`: 5 declared (`asked_claims_ncb`, `handled_objection`, `asked_next_step`, `ends_session`, `abusive`), each with meaning + anchors; `asked_claims_ncb` additionally carries a does-NOT-fire boundary vs. the opening vehicle/policy question.
- Zero tools, zero input variables, zero derived variables/sigils — matches Bajaj's reference shape exactly (pure `on intent()` state machine, no stored-variable routing anywhere).
- `welcome_message` set to `""` (silent-start framing — inferred convention, flagged as NEEDS HUMAN INPUT item 3 in the trace, not a confirmed platform pattern).
- `closing_message` set to the exact bilingual pairing of `deliver_assessment()`'s final spoken line, to pre-empt the sync-drift risk the requirement doc explicitly calls out in §8.

**Self-review finding (caught and fixed before this version shipped):** An earlier draft modeled requirement-doc row 2 (claims/NCB status question → reveal + loyalty doubt) as two separate states, with the first state's anti-jump `default` case advancing forward into the doubt-raising state — a Gate 5D anti-jump violation (an unclear/filler salesperson reply would have blindly advanced Ananya into raising a doubt he hadn't earned). Fixed by merging both into a single `raise_loyalty_doubt()` state that reveals the fact and raises the doubt in the same turn, mirroring Bajaj's own precedent (`raise_employer_doubt()` combines cover-reveal and the employer doubt identically). Re-verified clean afterward — see `smart-coach-v1-trace.md` Gate 5D section.

**Needs human input before deploy (carried into trace):**
1. Confirm `welcome_message: ""` is the platform's actual silent-start convention (no documented precedent found in skill docs).
2. Remember to manually re-sync `closing_message` if `deliver_assessment()`'s final line ever changes in a future version (known accepted risk, requirement doc §8).
3. THIN preamble spot: no `derived_sigils` construct explicitly named in the live preamble — immaterial to v1 (zero sigils used) but flag for any future version needing a mid-call capture.

## va-dsl-judge review — 2026-08-18

Ran the Phase 4 static content review (`clients/tata-aig/smart-coach/evals/judge-2026-08-18/report.md`).
**Verdict: FINDINGS — 1 fidelity issue, 0 nuance issues.** All 15 nuance-checklist items clean.

**Finding fixed same-day:** live `closing_dialogue` was missing the documented English parenthetical
pairing (`"बस इतना ही। All the best."` instead of the planned
`"बस इतना ही। All the best. (English: That is all. All the best.)"`) — a straight omission between
planning and push, item 2 above realized as a real drift. Fixed via
`PUT /v2/voice/agent-config/{agent_id}-draft` with `sop.closing_message` set to the full bilingual
pairing; re-verified live afterward, matches exactly.

Out-of-scope note carried forward for `va-voice-config`: live `llm_config` is still default
`openai/gpt-4.1-mini`, not the requirement doc §7 target Cerebras `gemma-4-31b`; `max_call_duration`
is `null`, not the doc's specified value.

## v2 — 2026-08-18 — added a second, harder role-play scenario

**Ask:** the client team wanted a second, tougher scenario alongside the original
discovery-led one, based on a reference script they generated with Claude (an "already
insured, resisting a switch" objection ladder). Adapted rather than copied verbatim — the
reference script's specific persona/premium details were example material only, not a
literal spec; rebuilt to be genuinely Tata AIG / NCB-Protection-specific.

**Fix — additive rebuild**, `smart-coach-v2-sop-content.txt`:
- Original discovery scenario (loyalty doubt → NCB-loss doubt → price doubt → stall → close
  → assessment) kept **fully intact**, states renamed with a `_discovery` suffix
  (`meet_salesperson_discovery`, `nudge_discovery`, `assessment_discovery`,
  `deliver_assessment_discovery`) to sit alongside the new scenario without collision.
- New scenario B ("resistant"): she's cold from the start (`open_resistant`), objects
  immediately to being pitched (`object_already_insured`), only softens for a real discovery
  question or a concrete hook (a named benefit/number) — generic reassurance gets pushed
  back on harder. Once engaged, she pivots to a trust question (claim-settlement quality,
  not price) rather than repeating the discovery ladder's doubts. Realistic ceiling is
  "send me details" (`soft_close`), not an instant close — if the salesperson pushes for a
  hard yes on the call, she resists (`resist_hard_close`).
- New `$$entry` routes via `switch(<<scenario_type>>)` — `case "resistant"` → scenario B,
  `default` → scenario A (discovery). New `scenario_type` input variable registered,
  default value `"discovery"`, so existing behavior is unaffected unless explicitly set.
- Two separate `assessment_rules_discovery` / `assessment_rules_resistant` rubric blocks —
  the resistant scenario scores hook-recovery, trust-answer quality, and whether the
  salesperson respected the realistic ceiling instead of over-pushing for a close.
- Passed full structural self-review (single `$$entry`/`$$goal`, all 20 states reachable, no
  dead ends, every intent declared and used 1:1, only allowed sigils/tags) before push.

**Operator edit made directly on the platform after the v2 push** (synced back into this
file 2026-08-18): removed "हम्म" (a filler word) from the fillers list in `script_discipline`
and from `raise_stall()`'s spoken line — minor tone adjustment, scenario A only.

**Status:** authored, self-reviewed, **published live** (not just draft) 2026-08-18.
