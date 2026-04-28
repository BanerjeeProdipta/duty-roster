"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			if (process.env.NODE_ENV !== "production") {
				// Clear any previously installed service worker in local dev so it
				// cannot keep serving stale cached Next.js assets.
				void navigator.serviceWorker.getRegistrations().then((registrations) => {
					for (const registration of registrations) {
						void registration.unregister();
					}
				});
				void caches.keys().then((keys) =>
					Promise.all(keys.map((key) => caches.delete(key))),
				);
				return;
			}

			navigator.serviceWorker.register("/sw.js").then((registration) => {
				console.log("SW registered:", registration.scope);
			});
		}
	}, []);

	return null;
}
