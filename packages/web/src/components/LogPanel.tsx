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
		const wrapper = wrapperRef.current;
		if (!node || !wrapper) return;
		const rect = node.getBoundingClientRect();
		const wrapperRect = wrapper.getBoundingClientRect();
		setCollapsedSize({ width: rect.width, height: rect.height });
		setOverlayOffsets({
			top: rect.top - wrapperRect.top,
			right: wrapperRect.right - rect.right,
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
		const wrapper = wrapperRef.current;
		if (!node || !wrapper) return;

		if (!isExpanded) {
			const rect = node.getBoundingClientRect();
			const wrapperRect = wrapper.getBoundingClientRect();
			setCollapsedSize({ width: rect.width, height: rect.height });
			setOverlayOffsets({
				top: rect.top - wrapperRect.top,
				right: wrapperRect.right - rect.right,
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
				className={`border rounded bg-white dark:bg-gray-800 shadow transition-all duration-300 ease-in-out ${
					isOverlay ? 'absolute left-auto' : 'w-full'
				} ${
					isExpanded
						? 'overflow-auto p-6 shadow-2xl'
						: 'p-4 overflow-y-auto max-h-80'
				}`}
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
								right: `${overlayOffsets.right}px`,
							}
						: {}),
				}}
				onTransitionEnd={handleTransitionEnd}
			>
				<div className="flex items-center justify-between gap-2">
					<h2 className="text-xl font-semibold">Log</h2>
					<button
						type="button"
						onClick={handleToggleExpand}
						aria-label={isExpanded ? 'Collapse log panel' : 'Expand log panel'}
						className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-slate-200 text-slate-700 hover:bg-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:focus-visible:ring-offset-gray-800"
					>
						<span aria-hidden="true" className="text-lg leading-none">
							{isExpanded ? '⤡' : '⛶'}
						</span>
					</button>
				</div>
				<ul
					ref={listRef}
					className={`mt-2 ${isExpanded ? 'space-y-2' : 'space-y-1'}`}
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
