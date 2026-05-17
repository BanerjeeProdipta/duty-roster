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
			console.log(`[voice-server] connectSTT: connecting to ${STT_WS_URL} (attempt ${retryCount + 1})`);
			if (sttSocket) {
				sttSocket.close();
				sttSocket = null;
			}

			try {
				sttSocket = new WebSocket(STT_WS_URL);
			} catch (e) {
				console.log(`[voice-server] connectSTT: new WebSocket threw:`, e);
				scheduleRetry(ws);
				return;
			}

			sttSocket.onopen = () => {
				console.log(`[voice-server] connectSTT: STT socket OPEN`);
				retryCount = 0;
				everConnected = true;
				ws.send(JSON.stringify({ type: "stt_ready" }));
				console.log(`[voice-server] sent stt_ready to browser, flushing ${audioBuffer.length} buffered chunks`);
				for (const chunk of audioBuffer) {
					sttSocket!.send(chunk);
				}
				audioBuffer = [];
			};

			sttSocket.onmessage = (event) => {
				console.log(`[voice-server] STT message:`, typeof event.data === 'string' ? event.data.slice(0, 80) : 'binary');
				ws.send(event.data as string);
			};

			sttSocket.onclose = (e) => {
				console.log(`[voice-server] STT socket CLOSED code=${e.code} reason=${e.reason}`);
				sttSocket = null;
				if (everConnected) {
					ws.send(JSON.stringify({ type: "stt_disconnected" }));
				}
				scheduleRetry(ws);
			};

			sttSocket.onerror = (e) => {
				console.log(`[voice-server] STT socket ERROR:`, e instanceof Error ? e.message : e);
			};
		}

		function scheduleRetry(ws: WebSocket) {
			if (closed) return;
			const delay = Math.min(1000 * 2 ** retryCount, MAX_RETRY_DELAY);
			console.log(`[voice-server] scheduleRetry: retry ${retryCount + 1} in ${delay}ms`);
			retryCount++;
			retryTimeout = setTimeout(() => {
				if (closed) return;
				connectSTT(ws);
			}, delay);
		}
	}),
);

const PORT = Number.parseInt(process.env.VOICE_PORT ?? "3002", 10);
console.log(`Voice server ready → ws://localhost:${PORT}`);

export default { fetch: app.fetch, websocket, port: PORT };
