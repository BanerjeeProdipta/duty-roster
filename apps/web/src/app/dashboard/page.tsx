import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import Dashboard from "./dashboard";

export default async function DashboardPage() {
	const session = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
			throw: true,
		},
	});

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<div className="container mx-auto py-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">Dashboard</h1>
					<p className="text-muted-foreground">Welcome, {session.user.name}</p>
				</div>
				<span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
					Logged in
				</span>
			</div>
			<Dashboard />
		</div>
	);
}
