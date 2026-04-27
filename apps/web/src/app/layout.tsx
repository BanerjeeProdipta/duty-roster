import type { Metadata } from "next";
import { Noto_Sans_Bengali, Poppins } from "next/font/google";

import "../index.css";
import Header from "@/components/navbar/header";
import Providers from "@/components/provider";
import ServiceWorkerRegistration from "@/components/service-worker";

const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
});

const notoSansBengali = Noto_Sans_Bengali({
	variable: "--font-bengali",
	subsets: ["bengali"],
	weight: ["400", "700"],
});

export const metadata: Metadata = {
	title: "Duty-Roster",
	description: "Duty-Roster",
	manifest: "/manifest.webmanifest",
	icons: [
		{
			rel: "icon",
			type: "image/png",
			sizes: "96x96",
			url: "/favicon/favicon-96x96.png",
		},
		{
			rel: "icon",
			type: "image/png",
			sizes: "32x32",
			url: "/favicon/favicon-96x96.png",
		},
		{
			rel: "icon",
			type: "image/png",
			sizes: "16x16",
			url: "/favicon/favicon-96x96.png",
		},
		{
			rel: "apple-touch-icon",
			sizes: "180x180",
			url: "/favicon/apple-touch-icon.png",
		},
	],
};

export const viewport = {
	themeColor: "#0f172a",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${poppins.variable} ${notoSansBengali.variable} font-sans antialiased`}
			>
				<Providers>
					<ServiceWorkerRegistration />
					<div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
						<Header />
						<main className="flex-1 p-4 lg:px-20 lg:py-6">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
