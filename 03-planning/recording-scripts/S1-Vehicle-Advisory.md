# S1 — AI Vehicle Advisory Agent

**Agent:** `TataAIG-Motor-S1-Vehicle-Advisory`  
**Agent ID:** `f589cf7e-78ca-49c2-b4e3-b8b1c10317df`  
**Call direction:** inbound  
**Clips to produce:** 13  —  ANANYA 7 · VIKRAM 6

**The scene.** Vikram taps the renewal ad inside the CRED app. First contact — he arrives confused about No-Claim Bonus, not with a product query.

**Who speaks first.** VIKRAM opens. Ananya does not speak first.

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

**VIKRAM** · `sc2_0.mp3`

> Hi — my policy renewal is coming up in a couple weeks and I'm honestly confused about No Claim Bonus. Can you explain it simply?

**ANANYA** · `sc2_1.mp3`

> Of course. N C B is a discount on your own-damage premium for every year you don't make a claim. It builds up like this:

**ANANYA** · `sc2_2.mp3`

> On screen: the standard N C B ladder — twenty percent after year one, climbing toward fifty percent by year five, as long as you stay claim-free.

**ANANYA** · `sc2_3.mp3`

> Where are you on that ladder right now?

**VIKRAM** · `sc2_4.mp3`

> 2 years claim-free (25%).

**ANANYA** · `sc2_5.mp3`

> Nice — 25% is a solid position. Quick honest check: did you raise any claim in the last policy year?

**VIKRAM** · `sc2_6.mp3`

> Yes, one small one.

**VIKRAM** · `sc2_7.mp3`

> Yeah — a small parking scrape last year, maybe eight thousand rupees in repairs.

**ANANYA** · `sc2_8.mp3`

> Thanks for being upfront. Here's some good news most people don't expect: with most insurers, one claim wipes your entire N C B back to zero. Tata AIG has an add-on called N C B Protection — it lets you make a claim without losing your No Claim Bonus discount at all. Your twenty-five percent stays twenty-five percent, not zero.

**VIKRAM** · `sc2_9.mp3`

> Wait, really? Every other quote I've seen assumed my bonus was gone. That's actually a big deal. Any tips before monsoon hits?

**ANANYA** · `sc2_10.mp3`

> Good timing to ask. Three quick ones: check your wiper blades, tyre tread depth, and get electricals water-proofed. Takes about twenty minutes at any service centre.

**ANANYA** · `sc2_11.mp3`

> Since your renewal's close — want to see what a Tata AIG quote could look like for your car?

**VIKRAM** · `sc2_12.mp3`

> Yes, show me.

---

**Done when:** all 13 files above exist in `04-build/tataaig-kit/audio/`.
