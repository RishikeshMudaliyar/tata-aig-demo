# S8a — Website Buy Journey (voice assist)

**Agent:** `TataAIG-Motor-S8a-Web-Voice-Assist`  
**Agent ID:** `11790784-ec96-461f-b1e5-0e5776b5281a`  
**Call direction:** inbound  
**Clips to produce:** 5  —  ANANYA 5 · VIKRAM 0

**The scene.** Screen-driven, near-silent by design — Ananya narrates alongside Tata AIG's own 4-step web application as Vikram clicks through it. No back-and-forth dialogue in this scene.

**Who speaks first.** ANANYA opens (narration only, no customer lines in this scene).

---

## How to record this one

1. Open the agent above in NuPlay and start a **web / playground call**.
2. Play Vikram yourself. Read his lines exactly as written — natural English, no need to clip or degrade it (this demo is English-only, no code-switching).
3. Ananya's lines are already fixed in her prompt as a playback engine. If she goes off-script, stop and retake.
4. Do a few takes. Keep the one with the best timing and warmth.
5. Split the recording per turn and save each as the **File** name below (mono MP3, ~32 kbps) into `04-build/tataaig-kit/audio/`.
6. When all clips for all 6 scenes are in, run `python3 build.py`.

> Only ANANYA clips must come from the agent recording. VIKRAM clips are you — record them however is convenient, same filenames.

---

## The script

**ANANYA** · `sc6_0.mp3`

> Let's start with your registration number — I'll pull everything else automatically.

**ANANYA** · `sc6_1.mp3`

> Now your previous policy — I'll pull it to work out your No-Claim Bonus.

**ANANYA** · `sc6_2.mp3`

> Pick your cover — I've only shown what's relevant to your car:

**ANANYA** · `sc6_3.mp3`

> Strengthen your cover — Zero Depreciation is already in. Engine Secure is popular for monsoon.

**ANANYA** · `sc6_4.mp3`

> Almost done — now a mobile number (only what compliance needs), then straight to review.

---

**Done when:** all 5 files above exist in `04-build/tataaig-kit/audio/`.
