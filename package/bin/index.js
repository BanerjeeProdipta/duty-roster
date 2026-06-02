#!/usr/bin/env node
const { spawn } = require("node:child_process");
const { join } = require("node:path");

spawn(
	process.execPath,
	[
		...process.execArgv,
		join(__dirname, "..", "dist", "index.js"),
		...process.argv.slice(2),
	],
	{ stdio: "inherit" },
).on("exit", (code) =>
	process.exit(code === undefined || code === null ? 0 : code),
);
