import { appRouter, createCallerFactory } from "@Duty-Roster/api";
import { createContextFromHeaders } from "@Duty-Roster/api/context";
import { headers } from "next/headers";
import { cache } from "react";

const createCaller = createCallerFactory(appRouter);

export const getTRPCServer = cache(async () => {
	return createCaller({
		auth: null,
		session: null,
	});
});

export const getAuthedTRPCServer = cache(async () => {
	const requestHeaders = await headers();

	return createCaller(
		await createContextFromHeaders(requestHeaders as unknown as Headers),
	);
});
