# 聖尼古拉斯與三姐妹

一部 5 分鐘、以程式碼逐格繪製的油畫厚塗短片：聖誕老人的原型——四世紀的聖尼古拉斯，暗中把金幣丟進窮人家煙囪的故事。

不使用影片生成模型。每一格都是 `film/` 裡的程式畫出來的：場景先畫成參考圖，轉成不越界的畫刀筆觸，再用斜射光照出顏料的厚度。`window.render(t)` 給定時間就畫出那一格。

- 風格：[Lemo-Opuscar](https://lemomo-ai.github.io/lemo-opuscar/) 的「Impasto Oil Painting 油畫厚塗」。構圖與色彩規則見 [docs/storyboard.md](docs/storyboard.md) 第一節
- 長度：5:00，1920×1080，24 fps，共 7200 格
- 結構：13 場 + 開場，41 鏡（04-2 因插入閃回，在程式裡拆成 a/b/c 三段）
- 前一個版本是水彩（OPUSCAR 98 No.76），留在 `main` 分支的歷史裡

## 在 Colab 渲染

開啟 [colab/render_colab.ipynb](https://colab.research.google.com/github/FelixF048/Santa/blob/impasto/colab/render_colab.ipynb)，先選 **T4 GPU** 執行階段，再依序執行每一格。

也可以在任何筆記本貼上這一格，一次跑完安裝、渲染、配樂、配音、驗證（厚塗版目前在 `impasto` 分支）：

```python
!cd /content && rm -rf Santa && git clone -q -b impasto https://github.com/FelixF048/Santa.git Santa
!cd /content/Santa && bash colab/run_all.sh
```

輸出：`out/santa.mp4`（有聲）、`out/santa_silent.mp4`（無聲，字幕已燒進畫面）、`out/check/sheet.jpg`（抽格）。

只想渲染無聲畫面：`node render/render.mjs --fps 24`（用 `SANTA_GL=egl` 指定 GPU 繪圖，見下方）。

畫面是 WebGL2，**一定要讓無頭瀏覽器用到顯示卡**。`run_all.sh` 會自動補裝繪圖函式庫並試出能用的方式（`SANTA_GL=egl` 或 `vulkan`），都不行才退回純 CPU 的軟體繪圖。偵測到 NVIDIA GPU 時，影片編碼也會改用 `h264_nvenc`。

### 聲音：配樂、音效、配音

```python
!pip -q install edge-tts
!python colab/music.py
!python colab/tts.py
```

- `music.py` 用 numpy 合成配樂與音效（撥弦加襯底長音、金幣聲、雪夜風聲），不下載素材，輸出 `out/music.wav`。
- `tts.py` 依字幕時間合成旁白與台詞，把配樂墊在人聲底下（人聲出現時自動壓低），輸出 `out/santa.mp4`。這一步會把字幕文字送到微軟的線上語音服務；不想外送就不要執行。
- 聲音是疊在已渲染的 `santa_silent.mp4` 上，改聲音不必重新渲染畫面。

### 執行階段怎麼選

厚塗引擎把每一格畫在 3840×2160 的內部畫布上（2 倍超取樣），這件事交給顯示卡很快，交給 CPU 很慢。實測（2026-11-11，無頭 Chromium，每格含 JPEG 輸出）：

| 繪圖方式 | 每格 | 全片 7200 格 |
|---|---|---|
| **Colab T4 + 8 核，6 個平行分段** | 平均約 0.026 秒 | **185 秒（實測）** |
| 內建顯示卡（Intel UHD 770），單一分段 | 約 0.2–0.3 秒 | 約 30 分鐘（估計） |
| 純 CPU 軟體繪圖（SwiftShader，12 核），2 倍取樣 | 約 2–4 秒 | 數小時（估計） |
| 純 CPU 軟體繪圖，1 倍取樣（`--ss 1`） | 約 0.8–1.5 秒 | 約 2 小時（估計） |

- 在 Colab 請選 **T4 GPU**；「大量 RAM」會多幾個 CPU 核心，可以多開幾個平行分段。
- Colab 的 GPU 執行階段只裝了運算用的驅動，瀏覽器預設用不到顯示卡。`run_all.sh` 會補裝同一代的 `libnvidia-gl`，並改用完整 Chromium 的新式無頭模式；實測（Tesla T4）1 秒的畫面從 67 秒降到 7 秒。
- 每換一個場景，第一格要多花 1–2 秒把參考圖轉成筆觸。
- 水彩版（Canvas 2D）在 T4 + 8 核上全片 288 秒；那個數字不適用於現在的厚塗版。

### 驗證

```python
!bash colab/check.sh            # 規格、畫面抽格（out/check/sheet.jpg）、響度、靜音偵測
!python colab/asr_check.py      # 用語音辨識檢查每一句配音在成品裡聽不聽得出來（本機辨識，不外送）
```

## 在本機預覽

需要 Node 18 以上，不必安裝任何套件：

```bash
node render/devserver.mjs
```

開啟 <http://localhost:8765/>，下方有時間軸可以拖曳、播放。網址加 `?t=238` 可直接跳到第 238 秒。

## 檔案

| 路徑 | 內容 |
|---|---|
| `docs/storyboard.md` | 分鏡表：41 鏡的時間碼、運鏡、畫面、主光、旁白與台詞 |
| `film/engine/` | 厚塗引擎（WebGL2）：畫刀筆觸、顏料厚度、斜射光；`plate.js` 把參考圖轉成筆觸 |
| `film/lib.js` | 把形狀記進參考圖的畫筆（`wash`、`pen`、`glow`），以及每格重建用的 `kn`（一刀）、`db`（一坨） |
| `film/figures.js` | 人物：每人十幾到三十幾刀，以輪廓和姿勢表演；臉只有膚色、鬍子，大比例才多一個眼點 |
| `film/sets.js` | 13 個場景，每個場景是幾層有視差的參考圖（用白天的固有色畫） |
| `film/shots.js` | 時間軸：每一鏡的鏡頭運動、人物走位、光源，以及全部字幕 |
| `film/main.js` | `render(t)`：參考圖轉筆觸、逐筆光照、自發光、轉場、字幕 |
| `render/render.mjs` | 無頭 Chromium 逐格擷取，送進 ffmpeg |
| `render/devserver.mjs` | 本機預覽伺服器 |
| `colab/` | Colab 筆記本與配音腳本 |

`film/index.html` 遵守 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的頁面約定（`window.READY`、`window.DUR`、`window.render(t)`、`window.TEXTS(t)`），所以也能用它的 `core/render` 工具渲染。

## 怎麼改

- **改字幕或台詞**：`film/shots.js` 最底下的 `CAPS`，每列是 `[開始秒, 結束秒, 說話者, 文字]`。
- **改某一鏡**：在 `film/shots.js` 找鏡號（例如 `'11-4'`），`cam` 是鏡頭起訖的 `[x, y, 縮放]`，`fig` 回傳該時刻每個人物的位置與姿勢，`amb` 是環境色，`lights` 是光源，`pre` / `post` 是特效筆觸。
- **改成「灰色世界」**：在某一鏡加上 `grey: 1`，布景就只剩明暗，自發光與紅斗篷仍有顏色。
- **改場景**：`film/sets.js` 的 `SETS.<名稱>`。
- **片尾文字**：`film/shots.js` 的 `EPI`。

所有隨機都有固定種子，任何一格都能單獨、以任何順序重繪，結果相同。

## 目前狀態

- 厚塗版的 43 段鏡頭都已在瀏覽器抽格檢查過，沒有執行錯誤；4 個「刷上去」的轉場也看過中間格。
- 已在 Colab（Tesla T4）渲染出完整成品：1920×1080、7200 格、300 秒，音訊 48 kHz 立體聲。
- 成品已通過的檢查：整體響度 −16.7 LUFS、真峰值 −1.5 dBFS、沒有超過 1.5 秒的靜音、片尾有配樂；語音辨識 28 句裡 27 句涵蓋率達 60% 以上（「那我去城裡工作！」57%，「城裡」被認成同音字）。
- 純 CPU 的無頭瀏覽器跑得動（WebGL2 與浮點畫布都支援），只是很慢。
- 配樂、音效、配音沿用水彩版的做法與時間，沒有為厚塗另外設計聲音（例如畫刀刮過的聲音）。
- 配樂是程式合成的簡單編曲，沒有經過人耳試聽調整；語音辨識只能證明聽得出內容，不能證明語氣自然。
- 父親與尼古拉斯用的是普通話男聲（台灣男聲在 Colab 上拿不到音訊），口音與旁白不同。
- 片尾的聖尼古拉斯生平（年份、地名）是依通行說法寫的草稿，尚未對照資料核實。
- 「因為你的女兒，為了家人願意獨自走那麼遠的路。」這句是補寫的，原劇本此處空白。

## 致謝

- 風格與厚塗引擎出自 LemoLab 的 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar)（MIT）。`film/engine/` 的兩個檔案取自該專案的 `styles/impasto/demo/engine/`，授權條款在 `film/engine/LICENSE`；本片在 `impasto.js` 加了逐筆光照。
- 場景、人物、分鏡、時間軸與渲染流程是本專案自己寫的。
