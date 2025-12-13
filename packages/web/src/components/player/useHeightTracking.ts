import { useEffect, useRef, type RefObject } from 'react';

/**
 * Custom hook to track element height and report changes via callback.
 * Uses ResizeObserver when available, falls back to window resize listener.
 */
export function useHeightTracking(
	onHeightChange: ((height: number) => void) | undefined,
): RefObject<HTMLDivElement | null> {
	const panelRef = useRef<HTMLDivElement | null>(null);
	const heightCallbackRef = useRef<typeof onHeightChange | null>(null);

	useEffect(() => {
		heightCallbackRef.current = onHeightChange;
	}, [onHeightChange]);

	useEffect(() => {
		const node = panelRef.current;
		if (!node) {
			return;
		}

		let frame = 0;
		const updateHeight = () => {
			if (!panelRef.current || !heightCallbackRef.current) {
				return;
			}
			heightCallbackRef.current(
				panelRef.current.getBoundingClientRect().height,
			);
		};

		updateHeight();

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateHeight);
			return () => {
				window.removeEventListener('resize', updateHeight);
			};
		}

		const observer = new ResizeObserver(() => {
			frame = window.requestAnimationFrame(updateHeight);
		});

		observer.observe(node);

		return () => {
			observer.disconnect();
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
		};
	}, []);

	return panelRef;
}
