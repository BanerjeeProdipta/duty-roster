import type React from "react";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-center p-4 font-sans selection:bg-primary/10">
			{/* Main Container */}
			<div className="flex w-full max-w-[1100px] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
				{/* Left Side: Auth Form */}
				<div className="flex w-full flex-col justify-center px-8 py-12 sm:px-16 lg:w-1/2">
					<div className="mx-auto w-full max-w-sm">{children}</div>
				</div>

				{/* Right Side: Visual/Feature Showcase */}
				<div className="relative hidden w-1/2 bg-slate-900 lg:block">
					{/* Decorative Gradients */}
					<div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
					<div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/10 blur-[100px]" />
					<div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />

					{/* Content */}
					<div className="relative flex h-full flex-col justify-end p-16 pb-24 text-white">
						<div className="max-w-md space-y-8">
							<div className="space-y-4">
								<div className="h-1.5 w-12 rounded-full bg-primary" />
								<h2 className="font-bold text-5xl leading-[1.1]">
									Manage your team <br />
									<span className="text-4xl text-white/60">
										without the chaos.
									</span>
								</h2>
							</div>

							<p className="text-lg text-slate-400 leading-relaxed">
								The most intuitive way to handle medical staff rotations.
								Powerful scheduling, preferences, and real-time updates—all in
								one place.
							</p>

							{/* Testimonial/Trust Badge */}
							<div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<div className="flex -space-x-3">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className="h-9 w-9 rounded-full border-2 border-slate-900 bg-slate-800"
										/>
									))}
								</div>
								<p className="font-medium text-slate-300 text-sm">
									Joined by <span className="text-white">50+ Hospitals</span>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
