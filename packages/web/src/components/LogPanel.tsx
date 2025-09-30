import React, { useEffect, useRef, useState } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
	const { log: entries, ctx } = useGameEngine();
	const wrapperRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const [isExpanded, setIsExpanded] = useState(false);
	const [isOverlay, setIsOverlay] = useState(false);
	const [collapsedSize, setCollapsedSize] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const [expandedBase, setExpandedBase] = useState<{
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

	useEffect(() => {
		if (isExpanded) return;
		const node = containerRef.current;
		if (!node) return;
		const rect = node.getBoundingClientRect();
		setCollapsedSize({ width: rect.width, height: rect.height });
		setOverlayOffsets({
			top: rect.top,
			right: viewport.width - rect.right,
		});
	}, [entries, isExpanded, viewport.height, viewport.width]);

	const clampDimension = (target: number, viewportLimit: number) => {
		if (viewportLimit <= 0) return target;
		return Math.min(target, viewportLimit);
	};

	const expandedStyle =
		isExpanded && expandedBase
			? {
					width: `${clampDimension(
						expandedBase.width,
						viewport.width > 32 ? viewport.width - 32 : viewport.width,
					)}px`,
					height: `${clampDimension(
						expandedBase.height,
						viewport.height > 32 ? viewport.height - 32 : viewport.height,
					)}px`,
				}
			: undefined;

	const handleToggleExpand = () => {
		const node = containerRef.current;
		if (!node) return;

		if (!isExpanded) {
			const rect = node.getBoundingClientRect();
			setCollapsedSize({ width: rect.width, height: rect.height });
			setOverlayOffsets({
				top: rect.top,
				right: viewport.width - rect.right,
			});
			setExpandedBase({ width: rect.width * 2, height: rect.height * 4 });
			setIsOverlay(true);
			setIsExpanded(true);
			return;
		}

		setIsExpanded(false);
		setExpandedBase(null);
	};

	useEffect(() => {
		if (!isExpanded) return;
		setIsOverlay(true);
	}, [isExpanded]);

	const handleTransitionEnd = (
		event: React.TransitionEvent<HTMLDivElement>,
	) => {
		if (event.target !== event.currentTarget) return;
		if (isExpanded || !isOverlay) return;
		setIsOverlay(false);
		setOverlayOffsets(null);
	};

	useEffect(() => {
		const container = containerRef.current;
		const list = listRef.current;
		if (!container || !list) return;

		let rafId: number | null = null;

		const scrollToBottom = (behavior: ScrollBehavior) => {
			if (container.scrollHeight <= container.clientHeight) return;

			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				container.scrollTo({
					top: container.scrollHeight,
					behavior,
				});
			});
		};

		const hasWindow = typeof window !== 'undefined';
		const hasResizeObserver = hasWindow && 'ResizeObserver' in window;

		if (hasResizeObserver) {
			const observer = new ResizeObserver(() => {
				scrollToBottom('auto');
			});
			observer.observe(list);

			scrollToBottom('smooth');

			return () => {
				if (rafId !== null) cancelAnimationFrame(rafId);
				observer.disconnect();
			};
		}

		// Fallback for environments without ResizeObserver support.
		scrollToBottom('smooth');
		if (!hasWindow)
			return () => {
				if (rafId !== null) cancelAnimationFrame(rafId);
			};

		const timeout = window.setTimeout(() => {
			scrollToBottom('auto');
		}, 150);

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			window.clearTimeout(timeout);
		};
	}, [entries]);

	return (
		<div
			ref={wrapperRef}
			className={`relative ${isExpanded || isOverlay ? 'z-50' : ''}`}
			style={
				collapsedSize && collapsedSize.height
					? { minHeight: `${collapsedSize.height}px` }
					: undefined
			}
		>
			<div
				ref={containerRef}
				className={`relative rounded-3xl border border-white/60 bg-white/75 shadow-2xl shadow-amber-500/10 backdrop-blur-xl transition-all duration-300 ease-in-out dark:border-white/10 dark:bg-slate-900/75 dark:shadow-slate-900/50 ${
					isOverlay ? 'fixed left-auto' : 'w-full'
				} ${isExpanded ? 'overflow-auto p-6' : 'max-h-80 overflow-y-auto p-4'}`}
				style={{
					...(expandedStyle ?? {}),
					...(!isExpanded && isOverlay && collapsedSize
						? {
								width: `${collapsedSize.width}px`,
								height: `${collapsedSize.height}px`,
							}
						: {}),
					...(isOverlay && overlayOffsets
						? {
								top: `${overlayOffsets.top}px`,
								right: `${Math.max(0, overlayOffsets.right)}px`,
							}
						: {}),
				}}
				onTransitionEnd={handleTransitionEnd}
			>
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
						Log
					</h2>
					<button
						type="button"
						onClick={handleToggleExpand}
						aria-label={isExpanded ? 'Collapse log panel' : 'Expand log panel'}
						className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 text-lg font-semibold text-slate-700 shadow hover:bg-white/90 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
					>
						<span aria-hidden="true" className="text-lg leading-none">
							{isExpanded ? '⤡' : '⛶'}
						</span>
					</button>
				</div>
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
	);
}
