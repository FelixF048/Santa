#!/bin/bash
# 一鍵流程：安裝 → （有 GPU 時測速）→ 渲染 → 配樂 → 配音 → 驗證
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
W=${1:-$(( N > 2 ? (N > 9 ? 8 : N - 1) : 2 ))}

# 有 GPU 時，先各渲染 3 秒比較「CPU 繪圖」與「GPU 繪圖」：GPU 版要更快而且畫面一致（PSNR ≥ 35 dB）才採用
if nvidia-smi -L > /dev/null 2>&1 && [ -z "$SANTA_GPU" ]; then
  echo "== GPU 繪圖測速（245–248 秒，雪夜場景）=="
  a=$(date +%s%N); node render/render.mjs --from 245 --to 248 --workers 1 --out out/bench_cpu.mp4 > /dev/null; b=$(date +%s%N)
  cpu_ms=$(( (b - a) / 1000000 )); echo "CPU 繪圖：${cpu_ms} ms"
  a=$(date +%s%N)
  if SANTA_GPU=1 timeout 180 node render/render.mjs --from 245 --to 248 --workers 1 --out out/bench_gpu.mp4 > /dev/null 2>&1; then
    b=$(date +%s%N); gpu_ms=$(( (b - a) / 1000000 )); echo "GPU 繪圖：${gpu_ms} ms"
    psnr=$(ffmpeg -hide_banner -nostats -i out/bench_cpu.mp4 -i out/bench_gpu.mp4 -lavfi psnr -f null - 2>&1 | grep -o 'average:[0-9.inf]*' | tail -1 | cut -d: -f2)
    echo "兩者畫面差異 PSNR：${psnr} dB"
    if [ "$gpu_ms" -lt "$cpu_ms" ] && python3 -c "import sys; p='$psnr'; sys.exit(0 if p=='inf' or float(p)>=35 else 1)"; then
      export SANTA_GPU=1; echo "→ 採用 GPU 繪圖"
    else
      echo "→ 維持 CPU 繪圖（GPU 沒有比較快，或畫面不一致）"
    fi
  else
    echo "GPU 繪圖失敗或逾時 → 維持 CPU 繪圖"
  fi
fi

echo "== 渲染全片（${W} 個平行分段，SANTA_GPU=${SANTA_GPU:-0}）=="
node render/render.mjs --fps 24 --workers "$W"

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
