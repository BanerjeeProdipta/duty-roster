import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";

const { upgradeWebSocket, websocket } = createBunWebSocket();

const app = new Hono();

app.use(
	"*",
	cors({
		origin: ["http://localhost:3000", process.env.WEB_ORIGIN ?? ""].filter(
			Boolean,
		),
	}),
);

app.get("/health", (c) => c.json({ status: "ok" }));

const STT_WS_URL = process.env.STT_WS_URL ?? "ws://localhost:5001";

app.get(
	"/voice/stream",
	upgradeWebSocket(() => {
		let sttSocket: WebSocket | null = null;

		const connectSTT = () => {
			if (sttSocket) {
				sttSocket.close();
				sttSocket = null;
			}

			try {
				sttSocket = new WebSocket(STT_WS_URL);
				// @ts-expect-error Bun WebSocket accepts "buffer" binaryType
				sttSocket.binaryType = "buffer";
			} catch {
				// will be handled by connectSTT callers
			}
		};

		return {
			onOpen: (_e, ws) => {
				ws.send(JSON.stringify({ type: "connected" }));
				connectSTT();

				sttSocket!.onopen = () => {
					ws.send(JSON.stringify({ type: "stt_ready" }));
				};

				sttSocket!.onmessage = (event) => {
					ws.send(event.data as string);
				};

				sttSocket!.onclose = () => {
					ws.send(JSON.stringify({ type: "stt_disconnected" }));
					sttSocket = null;
				};

				sttSocket!.onerror = () => {
					ws.send(
						JSON.stringify({ type: "error", message: "STT connection failed" }),
					);
				};
			},

			onMessage: (evt, ws) => {
				const data = evt.data;

				if (typeof data === "string") {
					try {
						const cmd = JSON.parse(data);
						if (cmd.type === "restart") {
							connectSTT();
						}
					} catch {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Invalid text message",
							}),
						);
					}
					return;
				}

				// Binary audio chunk — forward to STT
				if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
					sttSocket.send(data as ArrayBuffer);
				}
			},

			onClose: () => {
				if (sttSocket) {
					sttSocket.close();
					sttSocket = null;
				}
			},
		};
	}),
);

const PORT = Number.parseInt(process.env.VOICE_PORT ?? "3002", 10);
console.log(`Voice server ready → ws://localhost:${PORT}`);

export default { fetch: app.fetch, websocket, port: PORT };
