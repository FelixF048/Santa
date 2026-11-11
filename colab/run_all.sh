#!/bin/bash
# 一鍵流程：安裝 → 找出能用的 GPU 繪圖方式 → 渲染 → 配樂 → 配音 → 驗證
#   bash colab/run_all.sh [workers]
# 成品：out/santa.mp4（有聲）、out/santa_silent.mp4（無聲）、out/check/sheet.jpg（抽格）
set -e
cd "$(dirname "$0")/.."
mkdir -p out

echo "== 環境 =="
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "沒有 GPU"
echo "CPU 核心：$(nproc)"

echo "== 安裝 =="
if [ ! -d node_modules/playwright ]; then
  apt-get -qq install -y fonts-noto-cjk ffmpeg > /dev/null 2>&1 || true
  fc-cache -f
  npm install --no-audit --no-fund --silent
  npx playwright install --with-deps chromium > /dev/null 2>&1
fi
pip -q install edge-tts faster-whisper opencc-python-reimplemented
node -v; ffmpeg -version | head -1

N=$(nproc)

# 畫面是 WebGL2（厚塗引擎），一定要讓無頭瀏覽器用到顯示卡才快：依序試 egl、vulkan，各渲染 1 秒，
# 看瀏覽器回報的繪圖裝置是不是 NVIDIA。都不行才退回純 CPU 的軟體繪圖（很慢，改用 1 倍取樣）。
MODE=${SANTA_GL:-}
if [ -z "$MODE" ]; then
  MODE=swiftshader
  if nvidia-smi -L > /dev/null 2>&1; then
    for m in egl vulkan; do
      echo "== 測試 GPU 繪圖：$m =="
      if out=$(SANTA_GL=$m timeout 300 node render/render.mjs --from 248 --to 249 --workers 1 --out out/bench_$m.mp4 2>&1); then
        echo "$out" | grep -E "renderer|done" || true
        if echo "$out" | grep -E "renderer:" | grep -q -i -E "nvidia|tesla"; then MODE=$m; break; fi
      else
        echo "$out" | tail -3; echo "→ $m 不能用"
      fi
    done
  fi
fi
if [ "$MODE" = swiftshader ]; then
  SS=${SANTA_SS:-1}; W=${1:-2}
  echo "!! 沒有用到顯示卡，改用軟體繪圖（1 倍取樣）。全片可能要數小時；建議改用 T4 GPU 執行階段。"
else
  SS=${SANTA_SS:-2}; W=${1:-$(( N > 2 ? (N > 7 ? 6 : N - 1) : 2 ))}
fi
export SANTA_GL=$MODE

echo "== 渲染全片（${W} 個平行分段，繪圖 ${MODE}，取樣 ${SS} 倍）=="
node render/render.mjs --fps 24 --workers "$W" --ss "$SS"

echo "== 配樂 =="
python3 colab/music.py
echo "== 配音與混音 =="
python3 colab/tts.py

echo "== 驗證 =="
bash colab/check.sh out/santa.mp4
echo "== 語音辨識檢查 =="
python3 colab/asr_check.py || echo "語音辨識檢查沒有跑完（不影響成品）"
echo "== 全部完成 =="
ls -lh out/*.mp4
