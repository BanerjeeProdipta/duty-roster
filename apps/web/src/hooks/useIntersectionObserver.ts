"use client";

import { useCallback, useRef, useState } from "react";

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
	threshold?: number;
	rootMargin?: string;
}

interface UseIntersectionObserverReturn {
	registerElement: (id: string, element: Element | null) => void;
	visibleIds: Set<string>;
}

export function useIntersectionObserver(
	options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverReturn {
	const { threshold = 0.1, rootMargin = "100px", ...rest } = options;
	const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
	const observerRef = useRef<IntersectionObserver | null>(null);
	const elementsRef = useRef<Map<string, Element>>(new Map());
	const restRef = useRef(rest);
	restRef.current = rest;

	const callback = useCallback((entries: IntersectionObserverEntry[]) => {
		setVisibleIds((prev) => {
			const next = new Set(prev);
			entries.forEach((entry) => {
				const id = entry.target.getAttribute("data-page-id");
				if (id) {
					if (entry.isIntersecting) {
						next.add(id);
					} else {
						next.delete(id);
					}
				}
			});
			return next;
		});
	}, []);

	const getObserver = useCallback(() => {
		if (!observerRef.current) {
			observerRef.current = new IntersectionObserver(callback, {
				threshold,
				rootMargin,
				...restRef.current,
			});
		}
		return observerRef.current;
	}, [callback, threshold, rootMargin]);

	const registerElement = useCallback(
		(id: string, element: Element | null) => {
			const observer = getObserver();

			if (element) {
				element.setAttribute("data-page-id", id);
				elementsRef.current.set(id, element);
				observer.observe(element);
			} else {
				const existing = elementsRef.current.get(id);
				if (existing) {
					observer.unobserve(existing);
					elementsRef.current.delete(id);
				}
			}
		},
		[getObserver],
	);

	return { registerElement, visibleIds };
}
