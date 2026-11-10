# 聖尼古拉斯與三姐妹

一部 5 分鐘、以程式碼逐格繪製的水彩短片：聖誕老人的原型——四世紀的聖尼古拉斯，暗中把金幣丟進窮人家煙囪的故事。

不使用影片生成模型。每一格都是 `film/` 裡的 Canvas 2D 程式畫出來的，`window.render(t)` 給定時間就畫出那一格。

- 風格：OPUSCAR 98 的 No.76「艾倫·李式水彩 + 羊皮紙地圖」，修改點見 [docs/storyboard.md](docs/storyboard.md) 第一節
- 長度：5:00，1920×1080，24 fps，共 7200 格
- 結構：13 場 + 開場，41 鏡（04-2 因插入閃回，在程式裡拆成 a/b/c 三段）

## 在 Colab 渲染

開啟 [colab/render_colab.ipynb](https://colab.research.google.com/github/FelixF048/Santa/blob/main/colab/render_colab.ipynb)，依序執行每一格。

或在自己的 Colab 筆記本貼上這一格：

```python
!git clone https://github.com/FelixF048/Santa.git
%cd Santa
!apt-get -qq install -y fonts-noto-cjk ffmpeg > /dev/null && fc-cache -f
!npm install --no-audit --no-fund && npx playwright install --with-deps chromium
!node render/render.mjs --fps 24
```

輸出在 `out/santa_silent.mp4`（無聲，字幕已燒進畫面）。

畫面是 Canvas 2D，繪圖主要吃 CPU，靠 `--workers` 平行分段加速；偵測到 NVIDIA GPU 時，影片編碼會自動改用 `h264_nvenc`。

### 配音（選用）

```python
!pip -q install edge-tts
!python colab/tts.py
```

依字幕時間合成旁白與台詞，輸出 `out/santa.mp4`。這一步會把字幕文字送到微軟的線上語音服務；不想外送就跳過。

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
| `film/lib.js` | 水彩筆觸：平塗、顆粒沉澱、邊緣積色、鉛筆輪廓、紙紋 |
| `film/figures.js` | 人物：小比例，以輪廓和姿勢表演，不畫五官 |
| `film/sets.js` | 13 個場景，每個場景畫成幾層有視差的快取圖 |
| `film/shots.js` | 時間軸：每一鏡的鏡頭運動、人物走位、光源，以及全部字幕 |
| `film/main.js` | `render(t)`：合成圖層、光照圖、自發光、字幕 |
| `render/render.mjs` | 無頭 Chromium 逐格擷取，送進 ffmpeg |
| `render/devserver.mjs` | 本機預覽伺服器 |
| `colab/` | Colab 筆記本與配音腳本 |

`film/index.html` 遵守 [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) 的頁面約定（`window.READY`、`window.DUR`、`window.render(t)`、`window.TEXTS(t)`），所以也能用它的 `core/render` 工具渲染。

## 怎麼改

- **改字幕或台詞**：`film/shots.js` 最底下的 `CAPS`，每列是 `[開始秒, 結束秒, 說話者, 文字]`。
- **改某一鏡**：在 `film/shots.js` 找鏡號（例如 `'11-4'`），`cam` 是鏡頭起訖的 `[x, y, 縮放]`，`fig` 回傳該時刻每個人物的位置與姿勢，`lights` 是光源。
- **改場景**：`film/sets.js` 的 `SETS.<名稱>`。
- **片尾文字**：`film/shots.js` 的 `EPI`。

所有隨機都有固定種子，任何一格都能單獨、以任何順序重繪，結果相同。

## 目前狀態

- 43 段鏡頭都已在瀏覽器逐一檢查過，沒有執行錯誤。
- `render/render.mjs` 與 Colab 筆記本尚未在 Colab 上實際跑過。
- 沒有配樂與音效；配音只有 TTS 人聲。
- 片尾的聖尼古拉斯生平（年份、地名）是依通行說法寫的草稿，尚未對照資料核實。
- 「因為你的女兒，為了家人願意獨自走那麼遠的路。」這句是補寫的，原劇本此處空白。

## 致謝

風格出自 Lemomo 的 [OPUSCAR 98](https://lemomo-ai.github.io/lemo-opuscar/opuscar98/#styles) No.76。本專案的繪圖程式是另外寫的，沒有使用該專案的程式碼。
