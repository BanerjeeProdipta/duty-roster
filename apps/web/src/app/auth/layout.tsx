import Image from "next/image";
import type React from "react";
import Grainient from "@/components/ui/Grainient";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-gray-50 p-4 font-sans selection:bg-primary/10">
			<div className="flex w-full max-w-[1100px] overflow-hidden rounded-[2rem] border border-gray-200/70 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] lg:flex-row">
				<div className="flex w-full flex-col justify-center px-8 py-12 sm:w-full sm:px-16 lg:w-1/2">
					<div className="mx-auto flex w-full max-w-sm flex-col">
						{children}
					</div>
				</div>

				<div className="relative hidden h-[600px] w-1/2 overflow-hidden lg:block">
					<Grainient
						className="absolute inset-0"
						color1="#93c5fd"
						color2="#fdba74"
						color3="#818cf8"
						grainAnimated={false}
					/>
					<div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-center text-gray-900">
						<p className="font-cursive font-medium text-4xl italic leading-snug lg:text-5xl">
							Scheduling
						</p>
						<p className="font-cursive font-medium text-4xl italic leading-snug lg:text-5xl">
							made simple!
						</p>
					</div>
					<div className="relative z-20 flex h-full items-center justify-center p-16">
						<Image
							src="/logo.png"
							alt="Duty-Roster logo"
							height={160}
							width={160}
							className="rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
