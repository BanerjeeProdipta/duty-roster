import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/navbar/header";
import Providers from "@/components/provider";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Duty-Roster",
	description: "Duty-Roster",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					<div className="relative flex min-h-svh flex-col bg-white">
						{/* Premium Background Accent */}
						<div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-white" />

						<Header />
						<main className="flex-1 animate-fade-in p-4 lg:px-20 lg:py-10">
							{children}
						</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
