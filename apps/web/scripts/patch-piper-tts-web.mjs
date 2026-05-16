#!/usr/bin/env node
// Patches @mintplex-labs/piper-tts-web to load all assets from
// the local server (/piper-assets/) instead of HuggingFace/CDN.
// Runs automatically after `bun install` via "postinstall" script.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const USE_LOCAL_PIPER_ASSETS =
	process.env.PIPER_LOCAL_ASSETS === "true" ||
	process.env.NEXT_PUBLIC_PIPER_LOCAL_ASSETS === "true";

if (!USE_LOCAL_PIPER_ASSETS) {
	console.log("[patch-piper] local Piper assets not enabled, skipping patch");
	process.exit(0);
}

const DIST = join(
	__dirname,
	"..",
	"node_modules",
	"@mintplex-labs",
	"piper-tts-web",
	"dist",
	"piper-tts-web.js",
);

let code = readFileSync(DIST, "utf-8");

// Already patched — skip
if (code.includes("/piper-assets/")) {
	console.log("[patch-piper] already patched, skipping");
	process.exit(0);
}

const replacements = [
	// Serve ONNX model from our server instead of HuggingFace
	[
		`const HF_BASE = "https://huggingface.co/diffusionstudio/piper-voices/resolve/main"`,
		`const HF_BASE = "/piper-assets/models"`,
	],
	// Serve ONNX Runtime WASM from our server instead of Cloudflare CDN
	[
		`const ONNX_BASE = "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/"`,
		`const ONNX_BASE = "/piper-assets/onnx/"`,
	],
	// Serve Piper phonemize WASM from our server instead of jsDelivr
	[
		`const WASM_BASE = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize"`,
		`const WASM_BASE = "/piper-assets/piper/piper_phonemize"`,
	],
	// Enable OPFS caching for our local URLs too (not just HuggingFace)
	[
		`if (!url.match("https://huggingface.co")) return;`,
		`if (!url.match("https://huggingface.co") && !url.match("/piper-assets/")) return;`,
	],
];

for (const [search, replace] of replacements) {
	if (!code.includes(search)) {
		console.error(`[patch-piper] NOT FOUND:\n  ${search}`);
		process.exit(1);
	}
	code = code.replaceAll(search, replace);
}

writeFileSync(DIST, code, "utf-8");
console.log("[patch-piper] patched successfully");
