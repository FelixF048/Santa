"""旁白與台詞配音（選用）。讀 out/captions.json，用 edge-tts 逐句合成，依字幕時間放到音軌上，再和無聲影片合併。

    pip install edge-tts
    python colab/tts.py                 # out/santa_silent.mp4 + 配音 → out/santa.mp4

注意：edge-tts 會把字幕文字送到微軟的線上語音服務。不想外送文字就不要執行這支，改用自己的錄音。
若 out/music.wav 存在（先執行 python colab/music.py），會把配樂墊在人聲底下。
"""
import asyncio, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
VOICE_DIR = os.path.join(OUT, "voice")

# 聲線：旁白用女聲，角色用不同的音高與語速區分
VOICES = {
    "vo":     dict(voice="zh-TW-HsiaoChenNeural", rate="-6%",  pitch="+0Hz"),
    "sis1":   dict(voice="zh-TW-HsiaoYuNeural",   rate="+0%",  pitch="+18Hz"),
    "mother": dict(voice="zh-TW-HsiaoChenNeural", rate="-4%",  pitch="-22Hz"),
    "woman":  dict(voice="zh-TW-HsiaoYuNeural",   rate="-4%",  pitch="-18Hz"),
    "father": dict(voice="zh-TW-YunJheNeural",    rate="-8%",  pitch="-14Hz"),
    "nick":   dict(voice="zh-TW-YunJheNeural",    rate="-4%",  pitch="+6Hz"),
}


def spoken(text: str) -> str:
    text = re.sub(r"^[^：「]{1,6}：", "", text)      # 去掉「大姐：」這類說話者標示
    return text.replace("「", "").replace("」", "").replace("……", "，").strip()


def duration(path: str) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


async def synth(caps):
    import edge_tts
    os.makedirs(VOICE_DIR, exist_ok=True)
    files = []
    for i, c in enumerate(caps):
        v = VOICES.get(c["who"], VOICES["vo"])
        f = os.path.join(VOICE_DIR, f"{i:02d}_{c['who']}.mp3")
        if not (os.path.exists(f) and os.path.getsize(f) > 0):
            ok = False
            # 先用指定的語速與音高；服務沒回音訊就重試，最後退回預設參數
            for kw in (dict(rate=v["rate"], pitch=v["pitch"]),) * 2 + (dict(),) * 2:
                try:
                    await edge_tts.Communicate(spoken(c["text"]), v["voice"], **kw).save(f)
                    ok = os.path.getsize(f) > 0
                except Exception as e:
                    print(f"  第 {i:02d} 句失敗（{type(e).__name__}），重試")
                    await asyncio.sleep(2)
                if ok:
                    break
            if not ok:
                if os.path.exists(f):
                    os.remove(f)
                f = None
        files.append(f)
    return files


def main():
    cap_path = os.path.join(OUT, "captions.json")
    video = os.path.join(OUT, "santa_silent.mp4")
    if not os.path.exists(cap_path) or not os.path.exists(video):
        sys.exit("先執行 node render/render.mjs 產生 out/santa_silent.mp4 與 out/captions.json")
    caps = json.load(open(cap_path, encoding="utf-8"))
    files = asyncio.run(synth(caps))
    missing = [i for i, f in enumerate(files) if f is None]
    if missing:
        print(f"有 {len(missing)} 句配音合成失敗：{missing}。這些句子在成品裡沒有人聲（字幕仍在畫面上）。")
    pairs = [(c, f) for c, f in zip(caps, files) if f]
    caps, files = [c for c, _ in pairs], [f for _, f in pairs]

    print("句  開始   字幕長  語音長  狀態")
    over = 0
    for i, (c, f) in enumerate(zip(caps, files)):
        d, slot = duration(f), c["t1"] - c["t0"]
        nxt = caps[i + 1]["t0"] if i + 1 < len(caps) else 1e9
        bad = c["t0"] + d > nxt
        over += bad
        print(f"{i:02d} {c['t0']:7.1f} {slot:6.1f} {d:6.1f}  {'與下一句重疊' if bad else ('超出字幕 %.1f 秒' % (d - slot) if d > slot else 'ok')}")
    if over:
        print(f"\n有 {over} 句語音會和下一句重疊：請縮短該句文字，或調整 film/shots.js 的 CAPS 時間。")

    inputs, filt = [], []
    for i, (c, f) in enumerate(zip(caps, files)):
        inputs += ["-i", f]
        ms = int(c["t0"] * 1000)
        filt.append(f"[{i + 1}:a]adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(files)))
    music = os.path.join(OUT, "music.wav")
    if not files:
        if not os.path.exists(music):
            sys.exit("沒有任何配音，也沒有 out/music.wav，無法產生有聲版")
        inputs += ["-i", music]
        filt.append("[1:a]loudnorm=I=-18:TP=-1.5:LRA=11,apad[aout]")
    elif os.path.exists(music):   # 有配樂（python colab/music.py）就墊在人聲底下，人聲出現時自動壓低
        inputs += ["-i", music]
        m = len(files) + 1
        filt.append(f"{mix}amix=inputs={len(files)}:normalize=0:dropout_transition=0,volume=1.6,asplit=2[v1][v2]")
        filt.append(f"[{m}:a]volume=0.55[mu];[mu][v2]sidechaincompress=threshold=0.03:ratio=6:attack=80:release=700[duck]")
        filt.append("[v1][duck]amix=inputs=2:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[aout]")
    else:
        filt.append(f"{mix}amix=inputs={len(files)}:normalize=0:dropout_transition=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[aout]")
    out = os.path.join(OUT, "santa.mp4")
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", video, *inputs, "-filter_complex", ";".join(filt),
           "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print("完成：", out)


if __name__ == "__main__":
    main()
