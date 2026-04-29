export default {
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	deps: {
		alwaysBundle: [/.*/],
	},
};
