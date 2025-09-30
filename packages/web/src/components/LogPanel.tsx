import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
	const { log: entries, ctx } = useGameEngine();
	const wrapperRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const [isExpanded, setIsExpanded] = useState(false);

	const [collapsedMetrics, setCollapsedMetrics] = useState<{
		width: number;
		height: number;
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
		const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
		setCollapsedMetrics({
			width: rect.width,
			height: rect.height,
			top: rect.top,
			right: viewportWidth ? viewportWidth - rect.right : 0,
		});
	}, [entries, isExpanded, viewport.height, viewport.width]);

	const expandedStyle = useMemo(() => {
		if (!isExpanded || !collapsedMetrics) return undefined;
		const viewportWidth = viewport.width || collapsedMetrics.width;
		const viewportHeight = viewport.height || collapsedMetrics.height;
		const minMargin = 16;
		const maxWidth = Math.max(
			viewportWidth - minMargin * 2,
			collapsedMetrics.width,
		);
		const maxHeight = Math.max(
			viewportHeight - minMargin * 2,
			collapsedMetrics.height,
		);
		const targetWidth = Math.min(
			Math.max(collapsedMetrics.width * 1.8, collapsedMetrics.width + 120),
			maxWidth,
		);
		const targetHeight = Math.min(
			Math.max(collapsedMetrics.height * 2, collapsedMetrics.height + 180),
			maxHeight,
		);

		const availableRight = Math.max(collapsedMetrics.right, minMargin);
		const maxTop = viewportHeight - targetHeight - minMargin;
		const desiredTop = Math.max(
			Math.min(collapsedMetrics.top, maxTop),
			minMargin,
		);

		return {
			position: 'fixed' as const,
			width: `${targetWidth}px`,
			height: `${targetHeight}px`,
			top: `${desiredTop}px`,
			right: `${availableRight}px`,
			maxWidth: `calc(100vw - ${minMargin * 2}px)`,
			maxHeight: `calc(100vh - ${minMargin * 2}px)`,
		};
	}, [collapsedMetrics, isExpanded, viewport.height, viewport.width]);

	const handleToggleExpand = () => {
		const node = containerRef.current;
		if (!node) return;

		if (!isExpanded) {
			const rect = node.getBoundingClientRect();
			const viewportWidth =
				typeof window === 'undefined' ? 0 : window.innerWidth;
			setCollapsedMetrics({
				width: rect.width,
				height: rect.height,
				top: rect.top,
				right: viewportWidth ? viewportWidth - rect.right : 0,
			});
			setIsExpanded(true);
			return;
		}

		setIsExpanded(false);
	};

	useEffect(() => {
		const container = containerRef.current;
		const list = listRef.current;
		if (!container || !list || isExpanded) return;

		let frame: number | null = null;

		const alignToBottom = () => {
			container.scrollTop = container.scrollHeight;
		};

		const scheduleAlignment = () => {
			if (frame !== null) cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				alignToBottom();
				frame = requestAnimationFrame(alignToBottom);
			});
		};

		scheduleAlignment();

		const cleanup = () => {
			if (frame !== null) {
				cancelAnimationFrame(frame);
				frame = null;
			}
		};

		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver(() => {
				scheduleAlignment();
			});
			observer.observe(list);
			observer.observe(container);
			return () => {
				cleanup();
				observer.disconnect();
			};
		}

		if (typeof MutationObserver !== 'undefined') {
			const observer = new MutationObserver(() => {
				scheduleAlignment();
			});
			observer.observe(list, { childList: true, subtree: true });
			return () => {
				cleanup();
				observer.disconnect();
			};
		}

		return cleanup;
	}, [entries.length, isExpanded]);

	const renderToggleButton = (variant: 'inline' | 'floating') => {
		const baseClasses =
			'inline-flex h-8 w-8 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-gray-800';
		const variantClasses =
			variant === 'floating'
				? ' border border-slate-300/70 bg-white/95 text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white dark:border-gray-700/70 dark:bg-gray-900/90 dark:text-slate-100 dark:hover:bg-gray-900'
				: ' border border-transparent bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600';

		return (
			<button
				type="button"
				onClick={handleToggleExpand}
				aria-label={isExpanded ? 'Collapse log panel' : 'Expand log panel'}
				className={`${baseClasses} ${variantClasses}`}
			>
				<span aria-hidden="true" className="text-lg leading-none">
					{isExpanded ? '⤡' : '⛶'}
				</span>
			</button>
		);
	};

	return (
		<div ref={wrapperRef} className={`relative ${isExpanded ? 'z-50' : ''}`}>
			<div
				ref={containerRef}
				className={`border rounded bg-white dark:bg-gray-800 shadow transition-all duration-300 ease-in-out ${
					isExpanded
						? 'overflow-auto p-6 shadow-2xl'
						: 'relative w-full max-h-80 overflow-y-auto p-4 no-scrollbar'
				}`}
				style={expandedStyle}
			>
				<div
					className={`inline-block items-center gap-2 ${
						isExpanded ? 'justify-between' : ''
					}`}
				>
					<h2 className="text-xl font-semibold">Log</h2>
				</div>
				<div className="pointer-events-none sticky float-right top-0">
					<div className="pointer-events-auto">
						{renderToggleButton('floating')}
					</div>
				</div>
				<ul
					ref={listRef}
					className={`mt-2 pointer-events-none ${isExpanded ? 'space-y-2' : 'space-y-1 pr-4'}`}
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
