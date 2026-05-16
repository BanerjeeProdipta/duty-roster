#!/usr/bin/env bash
set -euo pipefail

MODEL="vosk-model-small-en-us-0.15"
MODEL_URL="https://alphacephei.com/vosk/models/${MODEL}.zip"
MODELS_DIR="stt/models"

echo "==> Downloading Vosk model: ${MODEL}"
mkdir -p "${MODELS_DIR}"

if [ -d "${MODELS_DIR}/${MODEL}" ]; then
  echo "Model already exists at ${MODELS_DIR}/${MODEL}, skipping."
  exit 0
fi

TMP_ZIP=$(mktemp)
trap 'rm -f "${TMP_ZIP}"' EXIT

if command -v curl &>/dev/null; then
  curl -fsSL -o "${TMP_ZIP}" "${MODEL_URL}"
elif command -v wget &>/dev/null; then
  wget -q -O "${TMP_ZIP}" "${MODEL_URL}"
else
  echo "Error: need curl or wget to download model" >&2
  exit 1
fi

echo "==> Extracting model..."
unzip -q -o "${TMP_ZIP}" -d "${MODELS_DIR}"

echo "==> Done — ${MODELS_DIR}/${MODEL}"
echo "==> STT server expects model at: ${MODELS_DIR}/${MODEL}"
