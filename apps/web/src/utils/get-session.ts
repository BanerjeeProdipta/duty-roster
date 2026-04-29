import { getTRPCServer } from "./trpc-server";

export async function getSessionWithRole() {
	const trpcServer = await getTRPCServer();
	return trpcServer.getCurrentUser.query();
}
