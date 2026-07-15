import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(__dirname, "../public/sw.js");

function resolveCommitSha() {
	// Cloudflare Pages exposes the commit SHA as an env var during builds;
	// fall back to git for local builds.
	if (process.env.CF_PAGES_COMMIT_SHA) {
		return process.env.CF_PAGES_COMMIT_SHA.slice(0, 8);
	}
	try {
		return execSync("git rev-parse --short=8 HEAD", {
			encoding: "utf8",
		}).trim();
	} catch {
		return Date.now().toString(36);
	}
}

async function main() {
	const sha = resolveCommitSha();
	const source = await readFile(target, "utf8");
	const patched = source.replace(
		/const CACHE_NAME = '[^']*';/,
		`const CACHE_NAME = 'duty-roster-${sha}';`,
	);
	if (patched === source) {
		console.warn(
			"[set-sw-cache-version] CACHE_NAME pattern not found, sw.js left unchanged.",
		);
		return;
	}
	await writeFile(target, patched, "utf8");
	console.log(`[set-sw-cache-version] Set CACHE_NAME to duty-roster-${sha}`);
}

await main();
