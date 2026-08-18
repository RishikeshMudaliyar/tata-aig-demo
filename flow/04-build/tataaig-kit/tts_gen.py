import json, sys, os, subprocess, time
from kokoro_onnx import Kokoro
import soundfile as sf

lines = json.load(open("lines.json"))
scenes = sys.argv[1].split(",")
k = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
t0 = time.time()
n = 0
for key, v in lines.items():
    if not any(key.startswith(f"sc{s}_") for s in scenes): continue
    mp3 = f"audio/{key}.mp3"
    if os.path.exists(mp3): continue
    voice = "hf_alpha" if v["who"] == "ai" else "hm_omega"  # Indian-English voices
    samples, sr = k.create(v["text"], voice=voice, speed=1.03, lang="en-gb")
    sf.write(f"audio/{key}.wav", samples, sr)
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",f"audio/{key}.wav","-ac","1","-b:a","32k",mp3], check=True)
    os.remove(f"audio/{key}.wav")
    n += 1
print(f"done {n} lines for scenes {scenes} in {round(time.time()-t0)}s")
