"""配樂與音效：全部用 numpy 合成，不下載任何素材。輸出 out/music.wav（300 秒、44.1 kHz、立體聲）。

    python colab/music.py

樂器只有兩種：撥弦（像豎琴或音樂盒）與襯底長音。每一段的和弦與速度跟著分鏡的情緒走。
音效：金幣聲（11-1、11-2）、雪夜的風聲（11-4 到 12-3）。
"""
import os, wave
import numpy as np

SR = 44100
DUR = 300.0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
rng = np.random.default_rng(7)

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "Bb": 10, "B": 11}
def hz(name, octave): return 440.0 * 2 ** ((NOTE[name] + (octave - 4) * 12 - 9) / 12)
CH = {  # 和弦：根音、三音、五音
    "F": ["F", "A", "C"], "C": ["C", "E", "G"], "Dm": ["D", "F", "A"], "Bb": ["Bb", "D", "F"],
    "Gm": ["G", "Bb", "D"], "Am": ["A", "C", "E"], "A": ["A", "C", "E"],
}
# 段落：(開始秒, 結束秒, 和弦進行, 每個和弦幾秒, 撥弦音量, 襯底音量, 撥弦密度(每秒幾個音), 高八度)
SECTIONS = [
    (0, 8, ["F", "Bb"], 4.0, .30, .22, 1.2, 0),            # 開場地圖
    (8, 50, ["F", "C", "Dm", "Bb"], 3.5, .40, .18, 2.2, 0),  # 廚房、餐桌：溫暖
    (50, 98, ["Dm", "Bb", "Gm", "Am"], 4.0, .26, .26, 1.1, 0),  # 屋外的父親、父女對話：憂傷
    (98, 120, ["Dm", "Gm"], 5.5, .18, .28, .7, 0),          # 深夜離家：只剩單一樂器
    (120, 154, ["Gm", "Dm", "Bb", "Am"], 4.0, .22, .26, 1.0, 0),  # 進城、街頭痛哭
    (154, 198, ["F", "C", "Bb", "C"], 3.5, .36, .20, 2.0, 0),  # 宅邸、返家：明亮
    (198, 228, ["Dm", "Bb", "F", "Am"], 4.5, .22, .24, .9, 0),  # 長談、再出發、爐邊
    (228, 245, ["Bb", "C"], 4.0, .30, .16, 2.6, 1),         # 金幣：高音閃爍
    (245, 286, ["F", "C", "Dm", "Bb"], 3.5, .40, .24, 2.2, 0),  # 紅斗篷、道謝、離去：主題回歸
    (286, 300, ["Bb", "F"], 7.0, .30, .26, 1.0, 0),         # 片尾
]

L = np.zeros(int(SR * (DUR + 6)))
R = np.zeros_like(L)

def add(buf_l, buf_r, t, sig, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= len(buf_l): return
    n = min(len(sig), len(buf_l) - i)
    buf_l[i:i + n] += sig[:n] * (1 - max(0, pan))
    buf_r[i:i + n] += sig[:n] * (1 + min(0, pan))

def pluck(f, dur=2.6, amp=1.0):
    t = np.arange(int(SR * dur)) / SR
    s = (np.sin(2 * np.pi * f * t) + .42 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3) + .18 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 6))
    env = np.exp(-t * (1.6 + f / 900)) * np.minimum(1, t / .004)
    return amp * s * env

def pad(f, dur, amp=1.0):
    t = np.arange(int(SR * dur)) / SR
    s = sum(np.sin(2 * np.pi * f * d * t + ph) for d, ph in ((1, 0), (1.003, 1.1), (.997, 2.3), (2.001, .5))) / 4
    a = min(1.6, dur * .35)
    env = np.minimum(1, t / a) * np.minimum(1, (dur - t) / a)
    return amp * s * env

for (t0, t1, prog, clen, pv, dv, dens, hi) in SECTIONS:
    fade = lambda t: min(1.0, (t - t0) / 1.5 + .25, (t1 - t) / 1.5 + .25)
    k, t = 0, t0
    while t < t1:
        ch = CH[prog[k % len(prog)]]; d = min(clen, t1 - t)
        for j, n in enumerate(ch):   # 襯底
            add(L, R, t, pad(hz(n, 3 if j == 0 else 3 + (j > 1)), d + 1.2, dv * .5 * fade(t)), pan=(-.3, 0, .3)[j])
        add(L, R, t, pad(hz(ch[0], 2), d + 1.2, dv * .45 * fade(t)))
        # 撥弦分解和弦：上行為主，帶一點隨機
        steps = max(1, int(round(d * dens)))
        order = [0, 1, 2, 1, 2, 0, 2, 1]
        for s in range(steps):
            tt = t + s * d / steps + rng.uniform(-.012, .012)
            idx = order[s % len(order)]
            octv = 4 + hi + (1 if (s % 8) in (4, 6) else 0)
            add(L, R, tt, pluck(hz(ch[idx], octv), amp=pv * fade(tt) * rng.uniform(.7, 1.0)), pan=rng.uniform(-.45, .45))
        t += d; k += 1

# 音效：金幣的清脆聲
def ding(f, amp=.5):
    t = np.arange(int(SR * 1.8)) / SR
    return amp * (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) + .3 * np.sin(2 * np.pi * f * 5.4 * t)) * np.exp(-t * 5)
for t, f in ((229.5, 2093), (229.75, 2637), (230.1, 3136), (238.7, 2349), (238.85, 2794), (239.0, 3520), (246.0, 2637), (248.5, 2349)):
    add(L, R, t, ding(f), pan=rng.uniform(-.3, .3))

# 音效：雪夜的風（低通過的噪音，緩慢起伏）
def wind(t0, t1, amp):
    n = int((t1 - t0) * SR); x = rng.standard_normal(n)
    y = np.cumsum(x); y -= np.convolve(y, np.ones(4000) / 4000, mode="same")   # 去掉漂移，留下低頻
    y /= np.max(np.abs(y)) + 1e-9
    t = np.arange(n) / SR
    env = (.55 + .45 * np.sin(2 * np.pi * t / 7.3)) * np.minimum(1, t / 3) * np.minimum(1, (n / SR - t) / 3)
    return amp * y * env
add(L, R, 241.0, wind(241, 287, .16), pan=-.2)
add(L, R, 241.0, wind(241, 287, .13), pan=.25)
add(L, R, 98.0, wind(98, 120, .07))

mix = np.stack([L, R], axis=1)[: int(SR * DUR)]
t = np.arange(len(mix)) / SR
mix *= (np.minimum(1, t / 1.5) * np.minimum(1, (DUR - t) / 2.5))[:, None]
mix = np.tanh(mix * 1.1) / np.max(np.abs(np.tanh(mix * 1.1))) * .82
os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "music.wav")
with wave.open(path, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("完成：", path)
