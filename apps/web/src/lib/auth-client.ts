import type { UserRole } from "@Duty-Roster/auth";
import { env } from "@Duty-Roster/env/web";
import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: env.NEXT_PUBLIC_SERVER_URL,
	plugins: [
		adminClient(),
		inferAdditionalFields({
			user: {
				role: {
					type: "string",
				},
			},
		}),
	],
});

export type { UserRole };
