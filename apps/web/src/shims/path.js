export const join = (...args) => args.join("/");
export const resolve = (...args) => args.join("/");
export const dirname = (p) => p.split("/").slice(0, -1).join("/") || ".";
export const basename = (p) => p.split("/").pop();
export const extname = (p) => {
	const b = basename(p);
	const i = b.lastIndexOf(".");
	return i === -1 ? "" : b.substring(i);
};
export default { join, resolve, dirname, basename, extname };
