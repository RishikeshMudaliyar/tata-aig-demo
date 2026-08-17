# S7 — AI Re-engagement Agent

**Agent:** `TataAIG-Motor-S7-Re-engagement`  
**Agent ID:** `62619591-4c04-4d97-be00-073ded1569b3`  
**Call direction:** outbound  
**Clips to produce:** 14  —  ANANYA 8 · VIKRAM 6

**The scene.** Vikram stalled at document upload last night while switching his cover. Ananya re-engages, reason-aware.

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

**ANANYA** · `sc5_0.mp3`

> Good morning Vikram, Ananya from Tata AIG. I noticed you were switching your cover last night but paused at the document upload step. Can I help?

**VIKRAM** · `sc5_1.mp3`

> Yes, help me.

**ANANYA** · `sc5_2.mp3`

> No problem. To verify and transfer your N C B, I just need either your previous year's policy copy, or an N C B retention certificate from your current insurer. Either one works fine.

**VIKRAM** · `sc5_3.mp3`

> I've got last year's policy as a P D F. Sending it to you now.

**VIKRAM** · `sc5_4.mp3`

> I'm sending the policy copy on WhatsApp right now.

**ANANYA** · `sc5_5.mp3`

> Received — verifying now.

**ANANYA** · `sc5_6.mp3`

> Verified instantly: a valid prior policy showing twenty-five percent N C B — and with N C B Protection, last year's claim doesn't touch it at all, fully retained rather than reset.

**VIKRAM** · `sc5_7.mp3`

> Quick one — will my premium change now that you've seen this?

**ANANYA** · `sc5_8.mp3`

> No surprises here — this quote already includes your fully retained twenty-five percent N C B, so nothing changes. If anything ever needs adjusting, you'll always see the revised figure and reason before paying.

**VIKRAM** · `sc5_9.mp3`

> And is my data safe with you?

**ANANYA** · `sc5_10.mp3`

> Fully — encrypted in transit and at rest, stored only in India, used solely for this policy, as per the D P D P Act. Never for marketing.

**ANANYA** · `sc5_11.mp3`

> You're at 88% complete — just plan confirmation, add-ons and a quick K Y C left, about three minutes. Finish now?

**VIKRAM** · `sc5_12.mp3`

> Finish now →.

**ANANYA** · `sc5_13.mp3`

> Taking you to the app. Everything's carried forward — nothing to re-enter. See you there!

---

**Done when:** all 14 files above exist in `04-build/tataaig-kit/audio/`.
