# S6 — AI Outreach Agent (outbound call)

**Agent:** `TataAIG-Motor-S6-Outreach`  
**Agent ID:** `d48dc8ca-7156-454d-9f2f-30a322740b8c`  
**Call direction:** outbound  
**Clips to produce:** 9  —  ANANYA 5 · VIKRAM 4

**The scene.** Ananya calls Vikram at his chosen 10 AM callback window with the quote already agreed.

**Who speaks first.** ANANYA opens (outbound call).

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

**ANANYA** · `sc4_0.mp3`

> Good morning Vikram, this is Ananya from Tata AIG — this call is recorded for quality. Is now still okay to talk about your car's renewal?

**VIKRAM** · `sc4_1.mp3`

> Yes, I've got about ten minutes.

**ANANYA** · `sc4_2.mp3`

> Perfect. Yesterday we landed on Comprehensive cover with Zero Depreciation — about twenty-eight thousand five hundred rupees for the year. Any first thoughts?

**VIKRAM** · `sc4_3.mp3`

> Honestly, paying that in one shot feels like a lot right now.

**ANANYA** · `sc4_4.mp3`

> Totally fair. Two ways to soften it: three instalments of about nine thousand five hundred rupees each through our payment partner, or the full amount for a small early-payment saving. Which suits you better?

**VIKRAM** · `sc4_5.mp3`

> Instalments work better for me. One more thing — will someone need to physically inspect my car?

**ANANYA** · `sc4_6.mp3`

> Good question — for a standard renewal transfer like yours, usually a few photos uploaded in the app are enough. We call that a pre-insurance inspection. A physical visit only happens if the policy has lapsed a while, or something looks unclear in the photos.

**VIKRAM** · `sc4_7.mp3`

> Okay, that's easy enough. Send me everything — I'll finish it tonight.

**ANANYA** · `sc4_8.mp3`

> Done — the app link is on your WhatsApp, and by SMS as well. One thing as per I R D A I guidelines: never share your O T P with anyone, including us. Have a good day, Vikram!

---

**Done when:** all 9 files above exist in `04-build/tataaig-kit/audio/`.
