#!/usr/bin/env python3
"""
Single place for every swappable surface detail.

Lesson from the Kiwi build (turn 35: client asked to swap FuelUp -> CRED late, and
turn 16: PhonePe -> Cult.fit): names, apps, IDs and logos WILL change after review.
Keep them here so a change is one edit, not a find-and-replace across 200 beats.
"""

BRAND = {
    "company":       "Tata AIG",
    "company_full":  "Tata AIG General Insurance Company Limited",
    "company_short": "Tata AIG",
    "site":          "tataaig.com",
    "assistant":     "Ananya",              # the AI agent persona, all scenes
    "regulator":     "IRDAI",
    "privacy_act":   "DPDP Act",
    "tagline":       "25 Years · With You Always",   # from the confirmed logo lockup
}

# Confirmed brand color from user + logo file. Only this one hex is locked;
# do not invent secondary/accent colors without checking the live site first.
COLORS = {
    "blue":   "#004da7",   # primary brand blue, user-confirmed against logo asset
}

# Typeface substitution note (per LTF precedent — system stack over CDN import):
# Tata AIG's live site (view-source, 2026-08-17) pulls Google Fonts "Poppins"
# (fonts.googleapis.com/css2?family=Poppins:wght@400). Poppins is a geometric
# humanist sans; the closest system-stack equivalent without a CDN dependency is
# -apple-system / Segoe UI / system-ui — NOT a 1:1 match (Poppins has rounder,
# more geometric letterforms) but visually in the same family and license-free.
# Documented substitution, not silently swapped.
FONTS = {
    "heading": "-apple-system, 'Segoe UI', system-ui, sans-serif",
    "body":    "-apple-system, 'Segoe UI', system-ui, sans-serif",
    "mono":    "ui-monospace, 'SF Mono', 'Segoe UI Mono', monospace",
    "source_note": "Real site uses Google Fonts 'Poppins' — substituted with a "
                    "system font stack per playbook convention (no CDN dependency).",
}

AGENT_VOICE_NOTE = "Real human recording, NOT Kokoro/TTS — see runbook Step 6. " \
                   "Voice/provider selected in NuPlay, not here."

PERSONAS = {
    "MOTOR": {
        "name":         "Vikram Rao",
        "first":        "Vikram",
        "agent_name":   "Ananya",
        "vehicle":      "Hyundai Creta",
        "vehicle_year": 2022,
        "vehicle_fuel": "petrol",
        "reg_no":       "KA-03-JH-8821",
        "lead_id":      "TATAAIG-40217",
        "campaign_id":  "CMP-2214",   # cosmetic ID, unchanged from Kiwi pattern — confirm before final build if it needs to differ
        "phone_tail":   "42",
    },
}

# Product facts — verified live 2026-08-17 against tataaig.com, safe to use as-is.
# See tata-aig-flow-build.md memory for full sourcing/caveats on anything not listed here.
PRODUCT = {
    "MOTOR": {
        "label": "Comprehensive Car Insurance",
        # Real, live, verified add-on (fetched 2026-08-17 from
        # tataaig.com/motor-insurance/car-insurance/add-on-covers).
        # Exact quoted description: "This add-on allows policyholders to make a
        # claim without losing the no-claim bonus discount during the policy tenure."
        # This REPLACES Kiwi's fictional "Super NCB" mechanic. Per user decision:
        # dramatize as FULL protection (bonus stays exactly the same after a claim),
        # NOT a partial step-down tier — that tiering is Kiwi's invention, not a
        # documented Tata AIG mechanic.
        "ncb_addon_name": "NCB Protection",
        "ncb_addon_desc": "Make a claim without losing your No-Claim Bonus discount "
                           "during the policy tenure.",
        # 19-20 other real add-ons confirmed live on tataaig.com/motor-insurance/car-insurance/add-on-covers:
        "addons_verified": [
            "Zero Depreciation", "Return to Invoice (RTI)", "NCB Protection",
            "Engine Secure", "Consumable Expenses", "Roadside Assistance",
            "Tyre Secure", "Key Replacement", "Daily Allowance",
            "Emergency Transport & Hotel", "Belongings Cover",
            "Reinstatement Cover", "Emergency Medical Expenses",
            "Electric Surge (EV)", "Additional Towing",
            "Additional TP Property Damage", "Misfuelling",
            "Vehicle Loan Protector", "Pay As You Drive",
        ],
        # DO NOT use a specific claim-settlement day count (e.g. "within 3 days") —
        # corrected 2026-08-17, no such Tata-AIG-specific SLA was found live on
        # tataaig.com. Safe framing only: "straightforward claims settle quickly,
        # complex ones take longer" — no hard number without a fresh live check.
        "claim_speed_safe_framing": "We settle straightforward claims quickly — "
                                     "complex or disputed ones can take longer.",
        # FLAGGED UNVERIFIED — do not use without a fresh live re-check at build time:
        "csr_unverified": None,          # the "92%" figure is aggregator-sourced (Insure24), not IRDAI-primary
        "cashless_garages_unverified": "10,000+",  # ranges 5,300-10,000+ across sources; tataaig.com locator page itself says this
    },
}

# SOW chips — map to whatever milestone doc exists for this build, if any.
# Not populated yet — no Tata AIG SOW/milestone doc exists (unlike LTF's real SOW).
MVP = {
    "S1":  "MVP 1",
    "S2":  "MVP 1",
    "S345": "MVP 2",
    "S6":  "MVP 3",
    "S7":  "MVP 4",
    "S8a": "MVP 5",
    "S8b": "MVP 5",
}
