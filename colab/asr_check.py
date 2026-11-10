"""用語音辨識回頭檢查成品：每一句配音在最終混音裡是否聽得出來、時間是否落在預期位置。

    pip install faster-whisper opencc-python-reimplemented
    python colab/asr_check.py            # 讀 out/santa.mp4 與 out/voice_plan.json

辨識在本機（Colab）執行，不外送音訊。「涵蓋率」= 該句文字有多少比例在對應時間窗的辨識結果裡出現。
"""
import json, os, re, sys
from difflib import SequenceMatcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")


def norm(s, cc):
    return re.sub(r"[^一-鿿]", "", cc.convert(s))


def main():
    from faster_whisper import WhisperModel
    from opencc import OpenCC
    cc = OpenCC("t2s")
    plan = json.load(open(os.path.join(OUT, "voice_plan.json"), encoding="utf-8"))
    video = sys.argv[1] if len(sys.argv) > 1 else os.path.join(OUT, "santa.mp4")
    model = WhisperModel(os.environ.get("ASR_MODEL", "small"), device="cpu", compute_type="int8")
    segs, _ = model.transcribe(video, language="zh", word_timestamps=True, vad_filter=True, initial_prompt="以下是一段繁體中文的故事旁白與對話。")
    words = [(w.start, w.end, w.word) for s in segs for w in (s.words or [])]
    print(f"辨識出 {len(words)} 個字詞")
    bad = 0
    print("句  開始    涵蓋率  辨識結果")
    for i, c in enumerate(plan):
        a, b = c["start"] - 0.6, c["start"] + c["dur"] + 0.8
        heard = "".join(w for (s, e, w) in words if e > a and s < b)
        ref, hyp = norm(c["spoken"], cc), norm(heard, cc)
        cov = sum(m.size for m in SequenceMatcher(None, ref, hyp).get_matching_blocks()) / max(1, len(ref))
        flag = "" if cov >= 0.6 else "  ← 偏低"
        bad += cov < 0.6
        print(f"{i:02d} {c['start']:7.1f}  {cov:5.0%}   {heard.strip()[:44]}{flag}")
    print(f"\n{len(plan) - bad}/{len(plan)} 句涵蓋率達 60% 以上。")


if __name__ == "__main__":
    main()
