import React, {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
	const { log: entries, logOverflowed, ctx } = useGameEngine();
	const outerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const [isExpanded, setIsExpanded] = useState(false);
	const [collapsedSize, setCollapsedSize] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const [overlayOffsets, setOverlayOffsets] = useState<{
		top: number;
		right: number;
	} | null>(null);
	const [viewport, setViewport] = useState(() => ({
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight,
	}));
	const pendingScrollRef = useRef(false);
	const previousRectRef = useRef<DOMRect | null>(null);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const handleResize = () => {
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		};
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const expandedStyle = useMemo(() => {
		if (!isExpanded || !collapsedSize) return undefined;
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
		return {
			position: 'fixed' as const,
			width: `${targetWidth}px`,
			height: `${targetHeight}px`,
			top: `${availableTop}px`,
			right: `${availableRight}px`,
		};
	}, [
		collapsedSize,
		isExpanded,
		overlayOffsets,
		viewport.height,
		viewport.width,
	]);

	const handleToggleExpand = () => {
		const node = outerRef.current;
		if (!node) return;

		previousRectRef.current = node.getBoundingClientRect();

		if (!isExpanded) {
			if (!collapsedSize || !overlayOffsets) {
				const rect = node.getBoundingClientRect();
				setCollapsedSize({
					width: rect.width,
					height: rect.height,
				});
				setOverlayOffsets({
					top: rect.top,
					right: viewport.width - rect.right,
				});
			}
			setIsExpanded(true);
			return;
		}

		setIsExpanded(false);
		pendingScrollRef.current = true;
	};

	useLayoutEffect(() => {
		const node = outerRef.current;
		const previous = previousRectRef.current;
		previousRectRef.current = null;

		if (!node || !previous) {
			return;
		}

		const next = node.getBoundingClientRect();
		const scaleX = next.width > 0 ? previous.width / next.width : 1;
		const scaleY = next.height > 0 ? previous.height / next.height : 1;
		const translateX = previous.left - next.left;
		const translateY = previous.top - next.top;

		if (
			Math.abs(translateX) < 0.5 &&
			Math.abs(translateY) < 0.5 &&
			Math.abs(scaleX - 1) < 0.01 &&
			Math.abs(scaleY - 1) < 0.01
		) {
			return;
		}

		const previousOrigin = node.style.transformOrigin;
		node.style.transformOrigin = 'top right';

		if (typeof node.animate !== 'function') {
			node.style.transformOrigin = previousOrigin;
			return;
		}

		const animation = node.animate(
			[
				{
					transform: `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`,
				},
				{ transform: 'none' },
			],
			{
				duration: 300,
				easing: 'ease-in-out',
				fill: 'both',
			},
		);

		const cleanup = () => {
			node.style.transformOrigin = previousOrigin;
		};

		animation.addEventListener('finish', cleanup, { once: true });
		animation.addEventListener('cancel', cleanup, { once: true });
	}, [isExpanded]);

	useEffect(() => {
		if (!isExpanded) return;
		const container = scrollRef.current;
		if (!container) return;
		container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
	}, [isExpanded]);

	useEffect(() => {
		const container = scrollRef.current;
		const list = listRef.current;
		if (!container || !list) return;

		pendingScrollRef.current = true;

		if (typeof ResizeObserver === 'undefined') {
			container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
			return;
		}

		let raf = 0;
		const observer = new ResizeObserver(() => {
			if (!pendingScrollRef.current) return;
			pendingScrollRef.current = false;
			raf = window.requestAnimationFrame(() => {
				container.scrollTo({
					top: container.scrollHeight,
					behavior: 'smooth',
				});
			});
		});

		observer.observe(list);

		return () => {
			pendingScrollRef.current = false;
			observer.disconnect();
			if (raf) window.cancelAnimationFrame(raf);
		};
	}, [entries, isExpanded, listRef]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (isExpanded) return;

		const node = outerRef.current;
		if (!node) return;

		const ResizeObserverCtor: typeof ResizeObserver | undefined =
			window.ResizeObserver ??
			(typeof ResizeObserver !== 'undefined' ? ResizeObserver : undefined);

		const updateFromRect = (rect: DOMRect) => {
			setCollapsedSize({ width: rect.width, height: rect.height });
			setOverlayOffsets({ top: rect.top, right: viewport.width - rect.right });
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
					const rect = entry.target.getBoundingClientRect();
					setOverlayOffsets({
						top: rect.top,
						right: viewport.width - rect.right,
					});
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
	}, [isExpanded, viewport.width, viewport.height]);

	return (
		<div
			className={`relative ${isExpanded ? 'z-50' : ''}`}
			style={
				collapsedSize && collapsedSize.height
					? { minHeight: `${collapsedSize.height}px` }
					: undefined
			}
		>
			<div
				ref={outerRef}
				className={`relative rounded-3xl border border-white/60 shadow-2xl shadow-amber-500/10 transition-all duration-300 ease-in-out dark:border-white/10 dark:shadow-slate-900/50 frosted-surface ${
					isExpanded
						? 'bg-white/90 dark:bg-slate-900/90'
						: 'bg-white/75 dark:bg-slate-900/75'
				}`}
				style={{
					...(expandedStyle ?? {}),
					...(isExpanded ? {} : { width: '100%' }),
				}}
			>
				<div
					ref={scrollRef}
					className={`relative flex flex-col ${
						isExpanded
							? 'h-full overflow-y-auto p-6 custom-scrollbar'
							: 'max-h-80 overflow-y-auto p-4 no-scrollbar'
					}`}
				>
					<div className="flex items-start gap-2 pb-2">
						<h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
							Log
						</h2>
						<button
							type="button"
							onClick={handleToggleExpand}
							aria-label={
								isExpanded ? 'Collapse log panel' : 'Expand log panel'
							}
							className={`sticky ${
								isExpanded ? 'top-6' : 'top-4'
							} ml-auto inline-flex h-9 w-9 items-center justify-center self-start rounded-full border border-white/60 bg-white/85 text-lg font-semibold text-slate-700 shadow hover:bg-white/95 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900`}
							style={{ zIndex: 5 }}
						>
							<span aria-hidden="true" className="text-lg leading-none">
								{isExpanded ? '⤡' : '⛶'}
							</span>
						</button>
					</div>
					{logOverflowed ? (
						<p className="mt-2 text-xs italic text-amber-700 dark:text-amber-300">
							Older log entries were trimmed.
						</p>
					) : null}
					<ul
						ref={listRef}
						className={`mt-3 ${isExpanded ? 'space-y-3 text-sm' : 'space-y-2 text-xs'} text-slate-700 dark:text-slate-200`}
					>
						{entries.map((entry, idx) => {
							const aId = ctx.game.players[0]?.id;
							const bId = ctx.game.players[1]?.id;
							const colorClass =
								entry.playerId === aId
									? 'log-entry-a'
									: entry.playerId === bId
										? 'log-entry-b'
										: '';
							return (
								<li
									key={idx}
									className={`${
										isExpanded ? 'text-sm leading-relaxed' : 'text-xs'
									} font-mono whitespace-pre-wrap ${colorClass}`}
								>
									[{entry.time}] {entry.text}
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</div>
	);
}
