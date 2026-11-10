#!/bin/bash
# 成品驗證：規格、畫面抽格、響度、靜音偵測。用法：bash colab/check.sh [影片路徑]
set -e
cd "$(dirname "$0")/.."
F=${1:-out/santa.mp4}
mkdir -p out/check
echo "== 規格 =="
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,nb_frames,duration,sample_rate,channels -of default=nw=1 "$F"
echo "== 畫面抽格（每 12.5 秒一格，共 24 格）→ out/check/sheet.jpg =="
ffmpeg -y -v error -i "$F" -vf "select='not(mod(n\,300))',scale=480:-1,tile=6x4" -frames:v 1 -q:v 4 out/check/sheet.jpg
ls -l out/check/sheet.jpg
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$F" | grep -q audio; then
  echo "== 響度（EBU R128）=="
  ffmpeg -hide_banner -nostats -i "$F" -vn -af ebur128=peak=true -f null - 2>&1 | tail -12
  echo "== 超過 1.5 秒的靜音 =="
  ffmpeg -hide_banner -nostats -i "$F" -vn -af silencedetect=noise=-45dB:d=1.5 -f null - 2>&1 | grep silence_ || echo "沒有"
fi
