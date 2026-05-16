import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(
	__dirname,
	"../../..",
	"node_modules",
	"@cloudflare",
	"next-on-pages",
	"dist",
	"index.js",
);
const builtins = [
	"fs",
	"path",
	"module",
	"child_process",
	"crypto",
	"net",
	"tls",
	"os",
	"http",
	"https",
	"stream",
	"url",
	"zlib",
	"assert",
	"util",
	"tty",
	"dns",
	// Large browser libs that should be externalized for Cloudflare Pages
	"onnxruntime-web",
	"@mintplex-labs/piper-tts-web",
	"@diffusionstudio/piper-wasm",
];

function formatBuiltins() {
	return builtins.map((name) => `"${name}"`).join(",\n      ");
}

function patchExternalBlocks(source) {
	return source.replace(/external:\s*\[([\s\S]*?)\]/g, (full, inner) => {
		if (
			!inner.includes('"node:*"') &&
			!inner.includes('"cloudflare:*"') &&
			!inner.includes('"async_hooks"')
		) {
			return full;
		}

		if (builtins.some((name) => inner.includes(`"${name}"`))) {
			return full;
		}

		const trimmed = inner.trim().replace(/^\s*/gm, "      ");
		return `external: [\n      ${formatBuiltins()},\n      ${trimmed}\n    ]`;
	});
}

async function main() {
	try {
		const source = await readFile(target, "utf8");
		const patched = patchExternalBlocks(source);
		if (patched === source) {
			console.log("[patch-next-on-pages-build] No patch needed.");
			return;
		}
		await writeFile(target, patched, "utf8");
		console.log(
			"[patch-next-on-pages-build] Patched @cloudflare/next-on-pages dist/index.js",
		);
	} catch (error) {
		console.error(
			"[patch-next-on-pages-build] Failed to patch next-on-pages:",
			error,
		);
		process.exit(1);
	}
}

await main();
