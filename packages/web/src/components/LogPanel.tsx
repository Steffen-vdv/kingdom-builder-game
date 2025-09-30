import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
	const { log: entries, ctx } = useGameEngine();
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const [isExpanded, setIsExpanded] = useState(false);
	const [collapsedSize, setCollapsedSize] = useState<{
		width: number;
		height: number;
		top: number;
		right: number;
	} | null>(null);
	const [viewport, setViewport] = useState(() => ({
		width: typeof window === 'undefined' ? 0 : window.innerWidth,
		height: typeof window === 'undefined' ? 0 : window.innerHeight,
	}));
	const pendingScrollRef = useRef(false);

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
		const horizontalPadding = viewport.width > 32 ? 32 : 16;
		const verticalPadding = viewport.height > 32 ? 32 : 16;
		const maxWidth = Math.max(0, viewport.width - horizontalPadding);
		const maxHeight = Math.max(0, viewport.height - verticalPadding);
		const targetWidth = Math.min(collapsedSize.width * 2, maxWidth);
		const targetHeight = Math.min(collapsedSize.height * 4, maxHeight);
		const desiredRight = Math.max(16, collapsedSize.right);
		const maxRight = Math.max(16, viewport.width - targetWidth - 16);
		const availableRight = Math.min(desiredRight, maxRight);
		const availableTop = Math.max(
			16,
			Math.min(collapsedSize.top, viewport.height - targetHeight - 16),
		);
		return {
			position: 'fixed' as const,
			width: `${targetWidth}px`,
			height: `${targetHeight}px`,
			top: `${availableTop}px`,
			right: `${availableRight}px`,
		};
	}, [collapsedSize, isExpanded, viewport.height, viewport.width]);

	const handleToggleExpand = () => {
		const node = containerRef.current;
		if (!node) return;

		if (!isExpanded) {
			const rect = node.getBoundingClientRect();
			setCollapsedSize({
				width: rect.width,
				height: rect.height,
				top: rect.top,
				right: viewport.width - rect.right,
			});
			setIsExpanded(true);
			return;
		}

		setIsExpanded(false);
		pendingScrollRef.current = true;
	};

	useEffect(() => {
		if (!isExpanded) return;
		const container = containerRef.current;
		if (!container) return;
		container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
	}, [isExpanded]);

	useEffect(() => {
		const container = containerRef.current;
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
		if (isExpanded) return;
		const node = containerRef.current;
		if (!node) return;
		const rect = node.getBoundingClientRect();
		setCollapsedSize({
			width: rect.width,
			height: rect.height,
			top: rect.top,
			right: viewport.width - rect.right,
		});
	}, [entries, isExpanded, viewport.width, viewport.height]);

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
				ref={containerRef}
				className={`relative rounded-3xl border border-white/60 shadow-2xl shadow-amber-500/10 transition-all duration-300 ease-in-out dark:border-white/10 dark:shadow-slate-900/50 frosted-surface ${
					isExpanded
						? 'bg-white/90 p-6 dark:bg-slate-900/90'
						: 'max-h-80 bg-white/75 p-4 dark:bg-slate-900/75'
				} ${
					isExpanded
						? 'overflow-y-auto custom-scrollbar'
						: 'overflow-y-auto no-scrollbar'
				}`}
				style={{
					...(expandedStyle ?? {}),
					...(isExpanded ? {} : { width: '100%' }),
				}}
			>
				<div className="flex items-center gap-2 pb-2">
					<h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
						Log
					</h2>
					<div className="ml-auto">
						<div className={`sticky ${isExpanded ? 'top-6' : 'top-4'}`}>
							<button
								type="button"
								onClick={handleToggleExpand}
								aria-label={
									isExpanded ? 'Collapse log panel' : 'Expand log panel'
								}
								className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/85 text-lg font-semibold text-slate-700 shadow hover:bg-white/95 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-100 dark:hover:bg-slate-900"
							>
								<span aria-hidden="true" className="text-lg leading-none">
									{isExpanded ? '⤡' : '⛶'}
								</span>
							</button>
						</div>
					</div>
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
