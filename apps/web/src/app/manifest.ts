import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Duty-Roster",
		short_name: "Duty-Roster",
		description: "Manage duty rosters efficiently",
		start_url: "/dashboard",
		scope: "/",
		display: "standalone",
		orientation: "portrait-primary",
		categories: ["business", "productivity"],
		background_color: "#f8fafc",
		theme_color: "#0f172a",
		icons: [
			{
				src: "/favicon/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/favicon/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/favicon/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "any",
			},
			{
				src: "/favicon/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
	};
}
