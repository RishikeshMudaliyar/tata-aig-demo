# Tata AIG Motor Demo — Recording Scripts

One file per agent. Each is self-contained: the scene, who speaks first, the exact
lines, and the audio filename every clip must be saved as.

| Agent | What it covers | Clips | Ananya | Vikram | Script |
|---|---|---|---|---|---|
| **S1** | AI Vehicle Advisory Agent | 13 | 7 | 6 | [S1-Vehicle-Advisory.md](S1-Vehicle-Advisory.md) |
| **S2** | AI Policy Advisor Agent | 17 | 11 | 6 | [S2-Policy-Advisor.md](S2-Policy-Advisor.md) |
| **S6** | AI Outreach Agent (outbound call) | 9 | 5 | 4 | [S6-Outreach.md](S6-Outreach.md) |
| **S7** | AI Re-engagement Agent | 14 | 8 | 6 | [S7-Re-engagement.md](S7-Re-engagement.md) |
| **S8a** | Website Buy Journey (voice assist) | 5 | 5 | 0 | [S8a-Web-Voice-Assist.md](S8a-Web-Voice-Assist.md) |
| **S8b** | AI Assisted-Close Agent (+ claims-readiness handoff) | 39 | 30 | 9 | [S8b-Assisted-Close.md](S8b-Assisted-Close.md) |
| | **Total** | **97** | **66** | **31** | |

## The method

Build the agents (already done) → have a real conversation with each on the NuPlay
playground → keep the best take → split it per turn → drop the clips into
`04-build/tataaig-kit/audio/` → `python3 build.py`. Real recorded audio then replaces
the current zero-audio placeholder state.

## Two rules that matter

- **Record Ananya from the agent, not from your own voice.** That is the entire
  point — the demo should play genuine NuPlay agent audio.
- **Vikram is English-only, no code-switching** — unlike LTF's Hinglish Rahul.
  Read his lines naturally, no need to clip or simplify them.

Filenames are not arbitrary — the demo looks up `AUDIO[key]` by exactly these names,
so a correctly-named clip just works.
