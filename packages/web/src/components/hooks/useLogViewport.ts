import type { CSSProperties, Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

interface ViewportSize {
	width: number;
	height: number;
}

interface OverlayOffsets {
	top: number;
	right: number;
}

interface UseLogViewportOptions {
	outerRef: RefObject<HTMLDivElement>;
	isExpanded: boolean;
}

interface UseLogViewportResult {
	collapsedSize: ViewportSize | null;
	setCollapsedSize: Dispatch<SetStateAction<ViewportSize | null>>;
	overlayOffsets: OverlayOffsets | null;
	setOverlayOffsets: Dispatch<SetStateAction<OverlayOffsets | null>>;
	viewport: ViewportSize;
}

interface UseLogExpandedStyleOptions {
	collapsedSize: ViewportSize | null;
	isExpanded: boolean;
	overlayOffsets: OverlayOffsets | null;
	viewport: ViewportSize;
}

interface ExpandedStyleMetrics {
	availableRight: number;
	availableTop: number;
	targetHeight: number;
	targetWidth: number;
}

function buildExpandedStyle({
	availableRight,
	availableTop,
	targetHeight,
	targetWidth,
}: ExpandedStyleMetrics): CSSProperties {
	return {
		position: 'fixed',
		width: targetWidth,
		height: targetHeight,
		top: availableTop,
		right: availableRight,
	};
}

export function useLogExpandedStyle({
	collapsedSize,
	isExpanded,
	overlayOffsets,
	viewport,
}: UseLogExpandedStyleOptions): CSSProperties | undefined {
	return useMemo(() => {
		if (!isExpanded || !collapsedSize) {
			return undefined;
		}

		const offsets = overlayOffsets ?? { top: 16, right: 16 };
		const horizontalPadding = viewport.width > 32 ? 32 : 16;
		const verticalPadding = viewport.height > 32 ? 32 : 16;
		const maxWidth = Math.max(0, viewport.width - horizontalPadding);
		const maxHeight = Math.max(0, viewport.height - verticalPadding);
		const targetWidth = Math.min(collapsedSize.width * 2, maxWidth);
		const targetHeight = Math.min(collapsedSize.height * 4, maxHeight);
		const desiredRight = Math.max(16, offsets.right);
		const maxRight = Math.max(16, viewport.width - targetWidth - 16);
		const availableRight = Math.min(desiredRight, maxRight);
		const availableTop = Math.max(
			16,
			Math.min(offsets.top, viewport.height - targetHeight - 16),
		);

		return buildExpandedStyle({
			availableRight,
			availableTop,
			targetHeight,
			targetWidth,
		});
	}, [
		collapsedSize,
		isExpanded,
		overlayOffsets,
		viewport.height,
		viewport.width,
	]);
}

export function useLogViewport({
	outerRef,
	isExpanded,
}: UseLogViewportOptions): UseLogViewportResult {
	const collapsedSizeState = useState<ViewportSize | null>(null);
	const overlayOffsetsState = useState<OverlayOffsets | null>(null);
	const [collapsedSize, setCollapsedSize] = collapsedSizeState;
	const [overlayOffsets, setOverlayOffsets] = overlayOffsetsState;
	const [viewport, setViewport] = useState<ViewportSize>(() => ({
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight,
	}));

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const handleResize = () => {
			setViewport({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		if (isExpanded) {
			return;
		}

		const node = outerRef.current;
		if (!node) {
			return;
		}

		const ResizeObserverCtor: typeof ResizeObserver | undefined =
			window.ResizeObserver ??
			(typeof ResizeObserver !== 'undefined' ? ResizeObserver : undefined);

		const updateFromRect = (rect: DOMRect) => {
			setCollapsedSize({
				width: rect.width,
				height: rect.height,
			});
			setOverlayOffsets({
				top: rect.top,
				right: viewport.width - rect.right,
			});
		};

		const applyOffsets = (target: Element) => {
			const rect = target.getBoundingClientRect();
			setOverlayOffsets({
				top: rect.top,
				right: viewport.width - rect.right,
			});
		};

		if (!ResizeObserverCtor) {
			updateFromRect(node.getBoundingClientRect());
			return;
		}

		let animationFrame = 0;
		const observer = new ResizeObserverCtor((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				setCollapsedSize({ width, height });
				if (animationFrame) {
					window.cancelAnimationFrame(animationFrame);
				}

				animationFrame = window.requestAnimationFrame(() => {
					applyOffsets(entry.target);
				});
			}
		});

		observer.observe(node);
		updateFromRect(node.getBoundingClientRect());

		return () => {
			observer.disconnect();
			if (animationFrame) {
				window.cancelAnimationFrame(animationFrame);
			}
		};
	}, [isExpanded, outerRef, viewport.height, viewport.width]);

	return {
		collapsedSize,
		setCollapsedSize,
		overlayOffsets,
		setOverlayOffsets,
		viewport,
	};
}
