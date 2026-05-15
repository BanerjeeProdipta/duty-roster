export const readFile = () => {
	throw new Error("fs.readFile is not supported in this environment");
};
export const readFileSync = () => {
	throw new Error("fs.readFileSync is not supported in this environment");
};
export const existsSync = () => false;
export const promises = {
	readFile: async () => {
		throw new Error(
			"fs.promises.readFile is not supported in this environment",
		);
	},
};
export default { readFile, readFileSync, existsSync, promises };
