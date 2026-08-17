# Tata AIG Flow — build runbook

Read this top to bottom before touching anything. Full background/rationale for every
decision here lives in memory (`tata-aig-flow-build.md` — ask Claude to check memory at
the start of the session if it doesn't load automatically). This file is the concrete
step-by-step; that one is the why.

**Goal for this session:** get everything done except the actual recording. The user
(Rishikesh) will record the customer side himself once the NuPlay agents are built and
publishable — that is the one step expected to remain after this runbook is followed.

---

## Step 0 — Unblock NuPlay access first

Before anything else, confirm the workspace is actually reachable:

```
mcp__nurix-local__nurix_list_voice_agents(workspace_id="58a091b8-1254-4b6c-bbac-29da582c34f5")
```

Last session this timed out twice in a row while an unscoped call
(`nurix_list_voices`) succeeded — almost certainly a VPN issue (per
`V-agent-Factory`'s own docs: "an empty/timeout response almost always means VPN isn't
connected, not an auth error"), not a bad workspace ID. If it still times out, tell the
user to check VPN before continuing — don't silently retry in a loop.

Once it resolves, list what's already in that workspace — there may be nothing, or
there may be a starter agent worth cloning from.

---

## Step 1 — Lock the persona and story, then confirm with the user

The user explicitly delegated picking the agent name and the pain-point angle to
Claude, but said this should be confirmed before 100+ dialogue beats get written
around it. Do this first, as a short back-and-forth, not a guess baked silently into
the build.

**Seed material (from last session's research, full detail in memory):**

- **Recommended provable-gap anchor:** the *Simma Ravi vs. Tata AIG* consumer-forum
  case — a stolen motorcycle claim rejected over an 8-day FIR delay that was the
  *police's* fault, not the owner's; the commission ruled in the customer's favor and
  ordered payment + damages. This is a real, dated, named case — cite it as the
  inspiration for the persona's anxiety, don't claim the demo's persona IS this person.
- **Decide:** does the 8-scene spine stay a pure acquisition story (like Kiwi's — buy/
  renew a policy, no claim ever depicted), or does one scene actually dramatize a
  claims/FNOL moment so the provable gap is shown, not just referenced? Kiwi's spine
  never shows a claim being filed. This is a real structural call — propose an answer,
  don't just default to copying Kiwi's structure unexamined.
- **Persona naming:** Kiwi used Arjun (customer) / Kiara (agent). Pick names that don't
  collide with anything real, fit an Indian motor-insurance buyer/claimant, and aren't
  reused from Kiwi/PHI/LTF.
- **CRM ID format:** follow Kiwi's `KIWI-77213` pattern → something like
  `TATAAIG-XXXXX`.
- **Vehicle/registration details:** invent something realistic and specific (Kiwi used
  a 2021 hatchback, `KA-05-MX-4417`) — a real-sounding registration format, a common
  Indian car or two-wheeler model appropriate to the price point of the story.

Bring the finalized persona/story/scene-mapping back to the user as a short summary
before writing full dialogue — this is worth one confirmation checkpoint, not a silent
100-beat commitment.

---

## Step 2 — Fork the kit

```bash
mkdir -p "/Users/rishikeshchandranmudaliyar/Tata AIG/TATA AIG - Flow/04-build/tataaig-kit"
cp -r "/Users/rishikeshchandranmudaliyar/Tata AIG/TATA AIG - Flow/LT-reference/02-reference-kiwi-phi/demo-kit/unzipped/kiwi-demo-kit/kit/"* \
      "/Users/rishikeshchandranmudaliyar/Tata AIG/TATA AIG - Flow/04-build/tataaig-kit/"
```

Follow the same numbered-folder convention the L&T project itself used
(`01-research`, `03-planning`, `04-build`, `05-output`, `06-deploy`) — create
`03-planning/`, `05-output/`, `06-deploy/` as siblings of `04-build/` when you reach
those stages, don't dump everything in one folder.

**Immediately fix these two known copy-paste leftovers in the forked `build.py`:**
1. Its docstring still says `# -> AI-DCAS_Board_Demo.html` (cosmetic, but wrong) —
   rename to `TataAIG_Motor_Board_Demo.html` or similar.
2. It hardcodes the literal string
   `'<button class="go" onclick="go(1)">Begin — Arjun\'s journey →</button>'` — this
   will silently keep saying "Arjun" in the built HTML unless replaced with the new
   persona's name.

Cross-reference the AI-DCAS/PHI kit's `CLAUDE.md` for shared-engine gotchas (a phone-
mockup CSS collapse bug, a ≤1100px breakpoint issue, the `</script>` safety check) —
Kiwi's kit has no `CLAUDE.md` of its own but shares the same `engine.js`/`base_v9.html`
shell, so PHI's documented traps likely still apply.

---

## Step 3 — Brand tokens

- **Color:** `#004da7` (confirmed, user-supplied).
- **Logo:** `/Users/rishikeshchandranmudaliyar/Tata AIG/Assets/ChatGPT Image Aug 17,
  2026, 09_15_23 PM.png` — the official "TATA AIG INSURANCE · 25 Years · With You
  Always" lockup, blue-on-transparent. **Check the Assets folder again at the start of
  this session** — the user said more files may have been added since.
- **Typeface:** identify what Tata AIG's real site uses (view-source), substitute a
  free/system equivalent per the playbook's standard rule, document the substitution
  in the constants file.
- **Regulator:** IRDAI (confirmed, same as Kiwi/PHI — not RBI).
- Follow the LTF precedent of moving to a system font stack instead of a Google Fonts
  CDN import, if the real Tata AIG typeface can't be embedded.

---

## Step 4 — Write the constants file

New file: `04-build/tataaig-kit/tataaig_constants.py` (mirror `ltf_constants.py`'s
shape — see `04-build/ltf-kit/ltf_constants.py` in the reference tree). Populate with:
brand dict, colors, taglines (pull verbatim from tataaig.com), persona dict, product
dict (use the verified add-on list and claim-timeline facts from memory — **do not**
use the unverified 92% CSR figure or an unconfirmed cashless-garage count without
checking the live page first), MVP/scene-chip mapping.

---

## Step 5 — Write the dialogue (`gen_data.py` equivalent)

Rewrite Kiwi's `gen_data.py` scene-by-scene (`S1`, `S2`, `S6_CHAT`/`S6_VOICE`, `S7`,
`S8A`, `S8B`) with the new persona/story, following the playbook's rules verified last
session:
- English only, no Hinglish register-switching (locked decision — simpler than Kiwi's
  actual dialogue, which does code-switch in places; strip that out, don't port it).
- Verify every number by hand (EMI/premium-style arithmetic if any appears) — never
  eyeball it.
- Keep the customer's language natural but not degraded — no requirement to clip
  sentences Hinglish-style since English-only was chosen.
- Every beat needs both an `x` (on-screen) and `v` (spoken) field where numbers/
  acronyms differ in the read-aloud form.

---

## Step 6 — Build the NuPlay voice agents (6 total: S1, S2, S6, S7, S8a, S8b)

Mirror the LTF recipe exactly (full detail in memory):

1. **Clone, don't create.** Find an existing published VOICE agent to clone from —
   check what's in workspace `58a091b8-1254-4b6c-bbac-29da582c34f5` first (Step 0); if
   nothing suitable exists there, clone from an existing Kiwi or PHI voice agent in
   whichever workspace holds those (`nurix_list_voice_agents` across workspaces, or
   ask the user which workspace Kiwi/PHI's agents live in).
2. For each of the 6 scenes: clone → `PUT /agent/{id}-draft` with only the changed
   fields → write the system prompt to the draft's `system_prompt_id` (read it fresh
   from `get_voice_agent(id + "-draft")`, don't reuse a published prompt ID) → set
   voice/language config → `publish_draft(id + "-draft")`.
3. **Prompt framing — playback engine, not open persona.** Use the exact LTF shape:
   *"You are a playback engine. Speak ONLY the exact [AGENT NAME] lines in the SCRIPT
   below — word for word,"* numbered `[STEP N]` blocks pairing the customer's line
   with the agent's scripted reply, a `HOLDING LINE` for off-script input, a rule
   against ever inventing a number.
4. Voice: English-only, so there's more voice choice than LTF had (LTF needed
   Hinglish-capable voices). Pick a real Indian-English female or appropriately-gendered
   voice available in the workspace — audition a couple, don't default to the first
   option.
5. **Do not build the actual audio yet** — that requires the user's live recording
   session through the published playground call. Everything up to "published and
   ready for a test call" is this session's job.

Report back to the user once all 6 are published with agent IDs, so they can start
recording whenever ready — this is the deliberate handoff point.

---

## Step 7 — Prepare for the recording session (but don't record)

- Generate a recording-script doc per agent (mirror
  `LT-reference/03-planning/recording-scripts/README.md`'s format) — one file per
  scene, self-contained: the exact lines, who speaks first, the audio filename each
  clip must be saved as (`sc<scene>_<index>.mp3` matching `lines.json` keys).
- Remind the user of the two rules that matter (from the LTF README, still true here):
  record the **agent's** voice from the actual NuPlay agent output, not from the
  user's own voice — that's the entire point of this path — and do NOT polish/correct
  the customer's lines when recording, read them as scripted.

---

## Step 8 — Railway deploy, tested with placeholder content

```bash
railway login   # if not already
# create a NEW project — do not reuse/relink ltf-personal-loan-demo or any Kiwi/PHI project
railway init    # name it tata-aig-insurance-demo (or similar, confirm exact name with user)
```

Build `06-deploy/` with the same nginx `Dockerfile` pattern the LTF project used (a
bare HTML file alone does not get a working server on Railway — confirmed, not a
guess). Deploy once with placeholder/no-audio content just to confirm the pipeline and
project linkage work, **before** real recorded audio exists — this catches Railway
project-linking mistakes early, per the playbook's explicit warning about deploy
folders silently staying linked to the wrong project.

---

## Definition of done for this session

- [ ] Persona/story/scene-mapping confirmed with the user
- [ ] Kit forked into `04-build/tataaig-kit/`, both known `build.py` leftovers fixed
- [ ] Constants file written with verified brand/product facts
- [ ] All 8 scenes' dialogue written (English only)
- [ ] 6 NuPlay voice agents cloned, configured, published, agent IDs reported to user
- [ ] Recording-script docs generated per agent
- [ ] Railway project created and a placeholder build successfully deployed
- [ ] User has everything needed to start recording — this is the only remaining step
