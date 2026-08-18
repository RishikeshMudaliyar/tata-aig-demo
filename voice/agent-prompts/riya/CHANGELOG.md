# Riya (Tata AIG Lead Qualifier) — `sop_content` changelog

## v1 — 2026-08-17

**Issue:** No `sop_content` authored yet. Agent scaffolded (Phase 2 complete) with a
placeholder prompt (`"PLACEHOLDER - to be authored by va-dsl-prompt"` visible in the live
compiled preamble's `agent riya { }` block, `opening_dialogue: "Placeholder - populated by
va-dsl-prompt."`). Also found: 0 of the 5 requirement-doc input variables were registered on
the platform (only a system `timezone` var existed).

**Root cause:** Expected — this is the first Phase 3 run for this agent (v1).

**Fix:**
- Registered `lead_name`, `lead_source`, `product_interest`, `salesperson_name`, `city` as
  `type: "input"` agent variables via `POST /agent-variable/` (Phase 0 gap-fill per the skill's
  Adaptation 1). All HTTP 201.
- Authored `sop_content` (`rules{}` + `flow{}` + `intents{}`, zero `tools{}` — confirmed
  tool-free agent) re-theming Bajaj Life's proven v7 production Lead Qualifier DSL to Tata
  AIG's motor-insurance / NCB Protection lead, per `tata-aig-requirement.md`'s locked 8-step
  flow, both showpiece guardrail moments (premium deflection, PAN/Aadhaar/bank digit refusal),
  and §5 hard rules (deduped against the live preamble's already-present
  `custom_guardrails{}`, authored only the spoken deflection scripts and in-step-resumption
  mechanic that policy statement doesn't itself supply).
- Deliberate deviation from Bajaj's v7 precedent: added 5 `%%track`/`%%collect` derived-variable
  sigils (`current_vehicle_insurer`, `claims_history_ncb_band`, `ncb_protection_awareness`,
  `urgency`, `callback_window`) matching the requirement doc's PCA field names exactly — Bajaj's
  v7 has zero sigils and relies solely on post-call PCA extraction. Full rationale in
  `riya-v1-trace.md` Phase 4.
- All 16 Phase-5 gates + Phase 6.5/6.6/7 structural barriers: PASS. See `riya-v1-trace.md` for
  the full gate-by-gate record.

**Status:** Authored, self-reviewed, reviewed by operator (sigil deviation confirmed to keep),
and **PUSHED LIVE to the draft** on 2026-08-17. Confirmed via
`GET .../fbad08b6-4f3f-48ec-ac6b-056c6ba536fe-draft`: `sop_content`, `opening_dialogue`,
`closing_dialogue`, and all 5 input variables (with demo values: Ananya Sharma / PolicyBazaar
/ Motor insurance - NCB Protection add-on / Vikram Singh / Pune) all present as authored,
`cookbook_revision: raven:r0.2.0` intact.

**Correction made during operator review (before push):** the original draft left
`welcome_message` unset. Checking Bajaj's own live Riya agent
(`f00a63fc-5e5d-43ff-bb1e-bd0b40ee6268`, workspace `3e0cd394-...`) showed it uses a SHORT
separate `opening_dialogue` ("नमस्ते, मैं Riya बोल रही हूँ Bajaj Life से। मैं एक AI assistant
हूँ।") distinct from the longer pitch inside `flow{}`'s first state — not empty, and not a
duplicate of the in-flow line. Authored a Tata AIG-equivalent short opening line
("नमस्ते, मैं Riya बोल रही हूँ Tata AIG से। मैं एक AI assistant हूँ।") matching this verified
pattern before pushing, avoiding a silent double-greeting or missing-disclosure risk.

## va-dsl-judge review — 2026-08-18

Ran the Phase 4 static content review (`clients/tata-aig/lead-qualifier/evals/judge-2026-08-18/report.md`).
**Verdict: FINDINGS — 2 fidelity issues, 0 nuance issues.** All 15 nuance-checklist items clean,
both showpiece guardrails intact, AI-disclosure proactive and consistent.

**Both findings fixed same-day:**
1. Live `closing_dialogue` silently reflected only the `accept_decline()` exit's line, out of 6
   distinct `<EOC/>` exits in the flow — misleading platform metadata, not a runtime bug. Fixed by
   setting `sop.closing_message` to a line representing the true primary success path
   (`close_warm`/booked-callback close): "समझ गई। <<salesperson_name>> आपको बताए गए समय पर कॉल
   करेंगे। धन्यवाद, आपका दिन अच्छा रहे!" via `PUT /v2/voice/agent-config/{agent_id}-draft`.
2. The 5 derived-variable sigils (`current_vehicle_insurer`, `claims_history_ncb_band`,
   `ncb_protection_awareness`, `urgency`, `callback_window`) were authored in `sop_content` via
   `%%track`/`%%collect` but never registered as platform agent variables — the trace's own
   flagged next-step, confirmed still open by the judge review. Fixed via 5×
   `nurix_create_agent_variable` calls, all `type: "runtime"`, `include_in_pca: true` (IDs
   151747–151751). Re-verified live afterward — all 5 now present in `agent_variables`.

This also newly added checklist entry #16 to `knowledge/dsl-content-learnings.md` (a
`closing_dialogue`/`opening_dialogue` platform field that reflects only one arbitrary exit-state's
line when the flow has multiple distinct exits should be flagged even with no behavioral impact).

Out-of-scope note carried forward for `va-voice-config`: live `llm_config` is still default
`openai/gpt-4.1-mini`, not the requirement doc §7 target Cerebras `gemma-4-31b`.

## v2 — 2026-08-18 — full flow replacement: qualification → appointment confirmation

**Ask:** the client team, after demoing v1, wanted Riya's whole purpose changed from an
8-step qualification flow to a short appointment-confirmation call, per a reference script
they generated with Claude and forwarded. Also flagged in testing: "PolicyBazaar" (a
third-party lead-source name) was audible in the live call — must never be spoken, this
demo is presented as coming directly from Tata AIG.

**Fix — full rebuild**, `riya-v2-sop-content.txt`:
- Old 8-step qualification flow (active-requirement → vehicle/insurer → claims/NCB →
  NCB-awareness → urgency → propose callback) retired entirely.
- New flow: identity check → purpose/permission → 2 data questions (vehicle model+registration,
  accident/claim Y-N) → propose a specific appointment slot → confirm or reschedule →
  WhatsApp-confirmation close.
- `lead_source`/PolicyBazaar removed from every spoken line and from the registered
  `agent_variables` (deleted). New explicit guardrail line: "Never say 'PolicyBazaar' or any
  third-party lead-source name."
- Old PCA-tracked variables (`current_vehicle_insurer`, `claims_history_ncb_band`,
  `ncb_protection_awareness`, `urgency`) deleted — no longer captured by the new flow.
  Replaced with `vehicle_model`, `vehicle_registration`, `accident_recent`, `claim_recent`
  (all `runtime`, `include_in_pca: true`), plus retained `callback_window`.
- New cross-question handling added per the client's explicit ask ("agent must handle cross
  questions, not just the golden path"): not-interested, busy/call-later, wrong number,
  "who's Vikram?" (doesn't recognise the referral) — each with its own intent + deflection,
  resuming the same step, never jumping ahead. Both original compliance guardrails (no
  premium quotes, no PAN/Aadhaar/bank digits) carried forward unchanged.
- Passed full structural self-review (single `$$entry`/`$$goal`, every state reachable, no
  dead ends, every intent declared and used, only allowed sigils/tags) before push.

**Operator edits made directly on the platform after the v2 push** (synced back into this
file 2026-08-18, since the platform is the source of truth for what's actually live):
- Added a **step 0: identity check** ahead of the original step 1 — `open_call()` now asks
  "am I speaking with `<<lead_name>>`?" before revealing anything about the enquiry, the
  salesperson's name, or the reason for the call. A new `wrong_person_close()` exit state
  handles a wrong-number/family-member pickup — exits cleanly without stating the purpose
  (privacy-conscious: don't leak that an enquiry/appointment exists to someone who isn't the
  actual lead). New intents `identity_confirmed`/`wrong_person`, new objection block
  `retry_identity`.
- Old step 1 (`open_call`, purpose+permission) renamed to `state_purpose()`, now reached only
  after identity is confirmed.
- Added a `deferral_answers` line for "are you a real person or a machine?" — reconfirms AI
  status, resumes current step.
- `offer_callback()` now has a step-1-aware branch: if reached before identity is confirmed,
  it does NOT name the salesperson ("मैं आपको कब call करूँ?" instead of naming Vikram) —
  consistent with the new no-reveal-before-identity rule.

**Status:** authored, self-reviewed, **published live** (not just draft) 2026-08-18 — the
identity-check edits above were made and published directly by the operator after the initial
v2 publish; this file was re-synced from the live platform config the same day to stay
canonical. Verified zero "PolicyBazaar" in any spoken line via a full competitor/third-party
leak audit (see the audit note in the Voice-build project memory) — the one remaining
occurrence is the guardrail line itself, which names the term only to forbid it.
