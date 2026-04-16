export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-[calc(100vh-60px)] justify-center gap-6 bg-gray-100 py-20">
			{/* Left (Form Section) */}

			{/* Form Content */}
			<div className="flex min-w-96 flex-col justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
				{children}
			</div>

			{/* Right (Visual Section) */}
			<div className="hidden items-center justify-center rounded-2xl bg-gray-900 lg:flex lg:w-1/2">
				<div className="max-w-md space-y-6 px-10">
					{/* Headline */}
					<h2 className="font-bold text-4xl text-white leading-tight">
						Manage your team
						<br />
						<span className="text-red-700">without the chaos</span>
					</h2>

					{/* Supporting text */}
					<p className="text-gray-400 leading-relaxed">
						Create schedules, assign duties, and stay organized with a simple,
						focused workflow.
					</p>

					{/* Subtle divider */}
					<div className="h-1 w-12 rounded-full bg-red-700" />
				</div>
			</div>
		</div>
	);
}
