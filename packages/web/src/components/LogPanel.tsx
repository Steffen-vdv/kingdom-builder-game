import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';
import { useLogExpandedStyle, useLogViewport } from './hooks/useLogViewport';

export default function LogPanel() {
	const { log: entries, logOverflowed, ctx: engineContext } = useGameEngine();
	const outerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const [isExpanded, setIsExpanded] = useState(false);
	const {
		collapsedSize,
		setCollapsedSize,
		overlayOffsets,
		setOverlayOffsets,
		viewport,
	} = useLogViewport({ outerRef, isExpanded });
	const expandedStyle = useLogExpandedStyle({
		collapsedSize,
		isExpanded,
		overlayOffsets,
		viewport,
	});
	const pendingScrollRef = useRef(false);
	const previousRectRef = useRef<DOMRect | null>(null);
	const handleToggleExpand = () => {
		const node = outerRef.current;
		if (!node) {
			return;
		}
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
		if (!isExpanded) {
			return;
		}
		const container = scrollRef.current;
		if (!container) {
			return;
		}
		container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
	}, [isExpanded]);

	useEffect(() => {
		const container = scrollRef.current;
		const list = listRef.current;
		if (!container || !list) {
			return;
		}

		pendingScrollRef.current = true;
		if (typeof ResizeObserver === 'undefined') {
			container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
			return;
		}

		let raf = 0;
		const observer = new ResizeObserver(() => {
			if (!pendingScrollRef.current) {
				return;
			}
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
			if (raf) {
				window.cancelAnimationFrame(raf);
			}
		};
	}, [entries, isExpanded, listRef]);

	const wrapperClasses = clsx('relative', { 'z-50': isExpanded });
	const panelClasses = clsx(
		'relative rounded-3xl border border-white/60 shadow-2xl',
		'shadow-amber-500/10 transition-all duration-300 ease-in-out',
		'dark:border-white/10 dark:shadow-slate-900/50 frosted-surface',
		isExpanded
			? 'bg-white/90 dark:bg-slate-900/90'
			: 'bg-white/75 dark:bg-slate-900/75',
	);
	const toggleButtonClasses = clsx(
		'absolute inline-flex h-9 w-9 items-center justify-center rounded-full',
		'border border-white/60 bg-white/85 text-lg font-semibold',
		'text-slate-700 shadow hover:bg-white/95 hover:text-slate-900',
		'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
		'dark:border-white/10 dark:bg-slate-900/85 dark:text-slate-100',
		'dark:hover:bg-slate-900',
	);
	const scrollContainerClasses = clsx(
		'relative flex flex-col',
		isExpanded
			? 'h-full overflow-y-auto px-6 pb-6 pt-6 custom-scrollbar'
			: 'max-h-80 overflow-y-auto px-4 pb-4 pt-4 no-scrollbar',
	);
	const listClasses = clsx(
		'mt-3 text-slate-700 dark:text-slate-200',
		isExpanded ? 'space-y-3 text-sm' : 'space-y-2 text-xs',
	);
	return (
		<div
			className={wrapperClasses}
			style={
				collapsedSize && collapsedSize.height
					? { minHeight: `${collapsedSize.height}px` }
					: undefined
			}
		>
			<div
				ref={outerRef}
				className={panelClasses}
				style={{
					...(expandedStyle ?? {}),
					...(isExpanded ? {} : { width: '100%' }),
				}}
			>
				<button
					type="button"
					onClick={handleToggleExpand}
					aria-label={isExpanded ? 'Collapse log panel' : 'Expand log panel'}
					className={toggleButtonClasses}
					style={{
						zIndex: 5,
						top: isExpanded ? '1.5rem' : '1rem',
						right: isExpanded ? '1.5rem' : '1rem',
					}}
				>
					<span aria-hidden="true" className="text-lg leading-none">
						{isExpanded ? '⤡' : '⛶'}
					</span>
				</button>
				<div ref={scrollRef} className={scrollContainerClasses}>
					<div className="flex items-start gap-2 pb-2 pr-12">
						<h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
							Log
						</h2>
					</div>
					{logOverflowed ? (
						<p className="mt-2 text-xs italic text-amber-700 dark:text-amber-300">
							Older log entries were trimmed.
						</p>
					) : null}
					<ul ref={listRef} className={listClasses}>
						{entries.map((entry, idx) => {
							const aId = engineContext.game.players[0]?.id;
							const bId = engineContext.game.players[1]?.id;
							const colorClass =
								entry.playerId === aId
									? 'log-entry-a'
									: entry.playerId === bId
										? 'log-entry-b'
										: '';
							const entryClasses = clsx(
								isExpanded ? 'text-sm leading-relaxed' : 'text-xs',
								'font-mono whitespace-pre-wrap',
								colorClass,
							);
							return (
								<li key={idx} className={entryClasses}>
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
