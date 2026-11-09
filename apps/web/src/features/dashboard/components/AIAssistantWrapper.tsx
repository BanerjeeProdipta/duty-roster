"use client";

import { can, PERMISSIONS } from "@Duty-Roster/config/permissions";
import dynamic from "next/dynamic";
import { authClient } from "@/lib/auth-client";

// Lazy load AITrigger with no SSR to avoid bundling ONNX runtime
const AITrigger = dynamic(
	() =>
		import("@/features/ai-assistant/components/AITrigger").then((mod) => ({
			default: mod.AITrigger,
		})),
	{ ssr: false },
);

export function AIAssistantWrapper() {
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: string } | undefined)?.role;
	const readOnly = !can(role, PERMISSIONS.MANAGE_ROSTER);

	return <AITrigger readOnly={readOnly} />;
}
