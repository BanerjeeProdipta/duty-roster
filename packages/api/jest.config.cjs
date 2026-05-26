/** @type {import('jest').Config} */
const config = {
	preset: "ts-jest/presets/default-esm",
	testEnvironment: "node",
	roots: ["<rootDir>/src"],
	testMatch: ["**/*.test.ts"],
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
};

module.exports = config;
