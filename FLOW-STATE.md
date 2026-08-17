# Tata AIG Flow — Current State

**As of 2026-08-17.** This document is the single source of truth for what's done and
what's pending on the Flow (board demo) track. Read this before touching anything —
it's meant to answer "what's left?" in one look.

---

## The one pending item

**Voice recordings.** Everything else is built, verified, deployed, and pushed. Once
recordings are dropped in and the kit is rebuilt/redeployed, Flow is fully done.

---

## Done ✅

| Area | Status |
|---|---|
| Persona, story, product facts | Locked — Vikram Rao / Ananya, NCB Protection (real, verified Tata AIG product), Hyundai Creta 2022 `KA-03-JH-8821`, CRM `TATAAIG-40217` |
| Dialogue (6 scenes) | Written, English-only, no fabricated numbers — 97 TTS lines, ~11.8 min |
| Kit rebrand | `base_v9.html` + `engine.js` + `gen_data.py` fully rebranded, zero leftover Kiwi/PHI/LTF strings |
| Landing page | Logo embedded, title editable via `build.py` constants, "SOW V1.4" text removed |
| Build pipeline | Reproducible — `gen_data.py` → `build.py` → single-file HTML, verified twice |
| NuPlay voice agents | All 6 built, published, independently audited — clean |
| Railway deploy | Live, byte-identical to local build, verified via HTTP + logs |
| End-to-end sanity check | Passed in full — build, deploy, and all 6 agents cross-verified |
| Git / GitHub | Pushed to https://github.com/RishikeshMudaliyar/tata-aig-demo |
| Recording-script docs | Generated per agent, in sync with live agent scripts |

**Live demo:** https://tata-aig-insurance-demo-production.up.railway.app
**Repo:** https://github.com/RishikeshMudaliyar/tata-aig-demo

---

## The 6 voice agents (ready for recording)

Workspace `360956ac-5963-4626-98d7-01a529d26e34` (shared with Kiwi/PHI/LTF, named
distinctly). Recording scripts: `03-planning/recording-scripts/`.

| Scene | Agent | agent_id | Direction | Clips |
|---|---|---|---|---|
| S1 | TataAIG-Motor-S1-Vehicle-Advisory | `f589cf7e-78ca-49c2-b4e3-b8b1c10317df` | inbound | 13 |
| S2 | TataAIG-Motor-S2-Policy-Advisor | `69776e26-6449-488d-9f4c-9f8886dc8c4b` | inbound | 17 |
| S6 | TataAIG-Motor-S6-Outreach | `d48dc8ca-7156-454d-9f2f-30a322740b8c` | outbound | 9 |
| S7 | TataAIG-Motor-S7-Re-engagement | `62619591-4c04-4d97-be00-073ded1569b3` | outbound | 14 |
| S8a | TataAIG-Motor-S8a-Web-Voice-Assist | `11790784-ec96-461f-b1e5-0e5776b5281a` | inbound | 5 |
| S8b | TataAIG-Motor-S8b-Assisted-Close | `6d16937a-6d4a-4e85-8a9a-51b350752d13` | inbound | 39 |

**Total: 97 clips (66 Ananya / 31 Vikram).**

---

## What happens when recordings arrive

1. You send the recordings (raw call recording per agent, or already-split clips).
2. I split per turn if needed (mono MP3, ~32kbps), name each exactly
   `sc<scene>_<index>.mp3` per the recording-script docs, drop into
   `04-build/tataaig-kit/audio/`.
3. Rebuild: `python3 gen_data.py && python3 build.py` — this embeds the real audio
   into the single-file HTML (currently 0 clips embedded, will become 97).
4. Redeploy: copy the new build into `06-deploy/index.html`,
   `railway up --detach --service tata-aig-insurance-demo`.
5. Commit + push to GitHub (per the "maintain both" instruction — every rebuild/
   redeploy cycle should also sync to the repo).
6. Re-verify: confirm the live site plays real audio, not silence, across all 6 scenes.

**At that point Flow is 100% complete.**

---

## Known non-issues (already checked, don't re-litigate)

- `LT-reference/` (509MB, different client's material) is intentionally excluded from
  the GitHub repo — this is expected, not a gap.
- The empty `58a091b8-1254-4b6c-bbac-29da582c34f5` workspace is intentional — Flow's
  agents live in the shared workspace instead (documented reason: the clone tool
  can't cross workspaces). That empty workspace is earmarked for the Voice track.
- Premium figures (₹28,500, ₹30,000, etc.) are illustrative/invented for internal
  consistency, same as Kiwi's original figures were — not scraped live quotes.
- No specific claim-settlement day count is quoted anywhere in the demo — this was a
  deliberate correction after an earlier research pass turned out to be wrong; the
  language is intentionally non-numeric ("as soon as possible", "typically quick").

---

## Reference docs (for more detail than this summary)

- Full build history/decisions: Claude memory file `tata-aig-flow-build.md`
- Agent prompts + verbatim scripts: `03-planning/TataAIG_Agent_Prompts_and_Scripts.md`
- Recording instructions: `03-planning/recording-scripts/README.md`
- Repo orientation: `README.md` (top level)
