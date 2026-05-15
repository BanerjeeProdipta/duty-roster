#!/usr/bin/env bash
set -euo pipefail

# Downloads/bundles Piper TTS assets into apps/web/public/piper-assets/
# for fully self-hosted TTS with zero CDN dependencies at runtime.
# Run after `bun install` (needs node_modules populated).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../public/piper-assets"
NODE_MODULES="$SCRIPT_DIR/../node_modules"

MODELS_DIR="$PUBLIC_DIR/models"
ONNX_DIR="$PUBLIC_DIR/onnx"
PIPER_DIR="$PUBLIC_DIR/piper"

VOICE="en_US-hfc_female-medium"
HF_BASE="https://huggingface.co/diffusionstudio/piper-voices/resolve/main"
PIPER_CDN="https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build"

echo "=== Downloading Piper TTS assets ==="

# --- 1. Voice model (.onnx + .onnx.json) from HuggingFace ---
mkdir -p "$MODELS_DIR/en/en_US/hfc_female/medium"
echo "[1/3] Downloading voice model (~63MB)..."
curl -fL# "$HF_BASE/en/en_US/hfc_female/medium/$VOICE.onnx" \
  -o "$MODELS_DIR/en/en_US/hfc_female/medium/$VOICE.onnx"
curl -fL# "$HF_BASE/en/en_US/hfc_female/medium/$VOICE.onnx.json" \
  -o "$MODELS_DIR/en/en_US/hfc_female/medium/$VOICE.onnx.json"

# --- 2. ONNX Runtime Web WASM — copy from installed npm package ---
# This ensures the WASM files always match the onnxruntime-web version
# installed in node_modules.
mkdir -p "$ONNX_DIR"
echo "[2/3] Copying ONNX Runtime WASM from node_modules..."
ONNX_SRC="$NODE_MODULES/onnxruntime-web/dist"
if [ -d "$ONNX_SRC" ]; then
  cp "$ONNX_SRC"/*.wasm "$ONNX_DIR/"
  cp "$ONNX_SRC"/*.jsep.mjs "$ONNX_DIR/" 2>/dev/null || true
  cp "$ONNX_SRC"/*.asyncify.mjs "$ONNX_DIR/" 2>/dev/null || true
  cp "$ONNX_SRC"/*.jspi.mjs "$ONNX_DIR/" 2>/dev/null || true
  echo "  Copied $(ls "$ONNX_DIR" | wc -l | tr -d ' ') files from onnxruntime-web $(node -e "console.log(require('$ONNX_SRC/../package.json').version)")"
else
  echo "  ERROR: onnxruntime-web not found in node_modules. Run 'bun install' first."
  exit 1
fi

# --- 3. Piper phonemize WASM from jsDelivr ---
mkdir -p "$PIPER_DIR"
echo "[3/3] Downloading Piper phonemize WASM..."
for f in \
  piper_phonemize.data \
  piper_phonemize.js \
  piper_phonemize.wasm; do
  curl -fL# "$PIPER_CDN/$f" -o "$PIPER_DIR/$f"
done

echo ""
echo "=== All assets downloaded ==="
echo "  Model:  $MODELS_DIR/en/en_US/hfc_female/medium/"
echo "  ONNX:   $ONNX_DIR/"
echo "  Piper:  $PIPER_DIR/"
echo ""
du -sh "$PUBLIC_DIR"
