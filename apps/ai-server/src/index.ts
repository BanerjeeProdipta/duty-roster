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
	"/ai/stream",
	upgradeWebSocket(() => {
		let sttSocket: WebSocket | null = null;
		let retryTimeout: ReturnType<typeof setTimeout> | null = null;
		let retryCount = 0;
		let everConnected = false;
		let closed = false;
		let audioBuffer: ArrayBuffer[] = [];

		const MAX_RETRY_DELAY = 30000;

		return {
			onOpen: (_e, ws) => {
				ws.send(JSON.stringify({ type: "connected" }));
				retryCount = 0;
				connectSTT(ws);
			},

			onMessage: (evt, ws) => {
				const data = evt.data;

				if (typeof data === "string") {
					try {
						const cmd = JSON.parse(data);
						if (cmd.type === "restart") {
							retryCount = 0;
							everConnected = false;
							audioBuffer = [];
							connectSTT(ws);
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

				const chunk = data as ArrayBuffer;
				if (sttSocket && sttSocket.readyState === WebSocket.OPEN) {
					sttSocket.send(chunk);
				} else if (audioBuffer.length < 200) {
					audioBuffer.push(chunk);
				}
			},

			onClose: () => {
				closed = true;
				if (retryTimeout) clearTimeout(retryTimeout);
				if (sttSocket) {
					sttSocket.close();
					sttSocket = null;
				}
				audioBuffer = [];
			},
		};

		function connectSTT(ws: WebSocket) {
			if (sttSocket) {
				sttSocket.close();
				sttSocket = null;
			}

			try {
				sttSocket = new WebSocket(STT_WS_URL);
			} catch {
				scheduleRetry(ws);
				return;
			}

			sttSocket.onopen = () => {
				retryCount = 0;
				everConnected = true;
				ws.send(JSON.stringify({ type: "stt_ready" }));
				for (const chunk of audioBuffer) {
					sttSocket!.send(chunk);
				}
				audioBuffer = [];
			};

			sttSocket.onmessage = (event) => {
				ws.send(event.data as string);
			};

			sttSocket.onclose = () => {
				sttSocket = null;
				if (everConnected) {
					ws.send(JSON.stringify({ type: "stt_disconnected" }));
				}
				scheduleRetry(ws);
			};
		}

		function scheduleRetry(ws: WebSocket) {
			if (closed) return;
			const delay = Math.min(1000 * 2 ** retryCount, MAX_RETRY_DELAY);
			retryCount++;
			retryTimeout = setTimeout(() => {
				if (closed) return;
				connectSTT(ws);
			}, delay);
		}
	}),
);

const PORT = Number.parseInt(process.env.AI_PORT ?? "3002", 10);
console.log(`AI server ready → ws://localhost:${PORT}`);

export default { fetch: app.fetch, websocket, port: PORT };
