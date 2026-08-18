#!/usr/bin/env python3
"""Assemble the final board demo HTML.
Usage:
  python3 gen_data.py          # regenerate scripts from source of truth (after editing)
  python3 tts_gen.py 2,3,4,5,6 # regenerate any missing audio (needs kokoro model, see CLAUDE.md)
  python3 build.py             # -> TataAIG_Motor_Board_Demo.html
"""
import json, base64, os, re

# ── Landing page title — edit these three lines to change the title everywhere ──
TAB_TITLE     = "One Customer, Six Conversations"   # browser tab / <title>
HERO_TITLE    = "One Customer, Six Conversations"   # big <h1> line on the landing slide
HERO_SUBTITLE = "Same AI system, start to finish."  # smaller line under the <h1>

chat  = open("chat_scripts.json").read()
voice = open("voice_scripts.json").read()
audio = {f[:-4]: base64.b64encode(open(f"audio/{f}","rb").read()).decode()
         for f in sorted(os.listdir("audio")) if f.endswith(".mp3")}

engine = open("engine.js").read().replace("__CHAT__", chat).replace("__VOICE__", voice).replace("__AUDIO__", json.dumps(audio))
assert "</script" not in engine.lower(), "unsafe </script> in embedded data"

logo = base64.b64encode(open("assets/tataaig-logo-small.png","rb").read()).decode()
favicon = base64.b64encode(open("assets/favicon.ico","rb").read()).decode()

base = (open("base_v9.html").read()
        .replace("__LOGO__", logo)
        .replace("__FAVICON__", favicon)
        .replace("__TAB_TITLE__", TAB_TITLE)
        .replace("__HERO_TITLE__", HERO_TITLE)
        .replace("__HERO_SUBTITLE__", HERO_SUBTITLE))
m = re.search(r"<script>.*?</script>", base, re.S)
out = base[:m.start()] + "<script>\n" + engine + "\n</script>" + base[m.end():]

out = out.replace('<button class="go" onclick="go(1)">Begin — Vikram\'s journey →</button>',
 '<button class="go" onclick="go(1)">Begin — Vikram\'s journey →</button>\n        <button class="go" style="background:var(--ink)" onclick="testVoice()">🔊 Test voice</button>', 1)
gate_css = """
.sndgate{position:fixed;right:22px;bottom:64px;z-index:99;display:none;align-items:center;gap:9px;
  background:var(--red);color:#fff;font-family:var(--fd);font-weight:700;font-size:13px;
  padding:11px 20px;border-radius:12px;box-shadow:0 12px 34px rgba(216,35,42,.4);
  animation:gatepulse 1.6s infinite;cursor:pointer}
@keyframes gatepulse{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
"""
out = out.replace("</style>", gate_css + "</style>", 1)
out = out.replace("</footer>", "</footer>\n<button id=\"sndgate\" class=\"sndgate\" onclick=\"gateClick()\">🔊 Click to enable sound</button>", 1)

open("TataAIG_Motor_Board_Demo.html","w").write(out)
print("built TataAIG_Motor_Board_Demo.html:", round(len(out)/1e6,2), "MB ·", len(audio), "audio clips")
