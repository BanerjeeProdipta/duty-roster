import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import "../index.css";
import Header from "@/components/navbar/header";
import Providers from "@/components/provider";

const poppins = Poppins({
	variable: "--font-poppins",
	subsets: ["latin"],
	weight: ["400", "500", "600"],
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
			<body className={`${poppins.variable} font-sans antialiased`}>
				<Providers>
					<div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
						<Header />
						<main className="flex-1 p-4 lg:px-20 lg:py-6">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	);
}
