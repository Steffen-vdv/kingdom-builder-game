import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

interface LogPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function LogPanel({ isOpen, onClose }: LogPanelProps) {
	const { log: entries, logOverflowed, ctx: engineContext } = useGameEngine();
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLUListElement>();
	const pendingScrollRef = useRef(false);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const node = containerRef.current;
		if (node) {
			node.focus({ preventScroll: true });
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isOpen, onClose]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const container = scrollRef.current;
		if (!container) {
			return;
		}

		container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const container = scrollRef.current;
		const list = listRef.current;
		if (!container || !list) {
			return;
		}

		pendingScrollRef.current = true;
		if (typeof ResizeObserver === 'undefined') {
			container.scrollTo({
				top: container.scrollHeight,
				behavior: 'smooth',
			});
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
	}, [entries, isOpen, listRef]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		pendingScrollRef.current = true;
	}, [entries, isOpen]);

	if (!isOpen) {
		return null;
	}

	const panelClasses = clsx(
		'relative flex h-full max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col',
		'pointer-events-auto',
		'rounded-3xl border border-white/60 bg-white/90 shadow-2xl',
		'shadow-amber-500/10 dark:border-white/10 dark:bg-slate-900/90',
		'dark:shadow-slate-900/50 frosted-surface',
	);
	const scrollContainerClasses = clsx(
		'relative flex h-full flex-col overflow-y-auto px-6 pb-6 pt-6',
		'custom-scrollbar',
	);
	const listClasses = clsx(
		'mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-200',
	);

	return (
		<div className="fixed inset-0 z-40">
			<div
				className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm pointer-events-auto"
				role="presentation"
				onClick={onClose}
			/>
			<div className="absolute inset-0 flex items-start justify-end px-4 py-16 sm:px-8 pointer-events-none">
				<div
					ref={containerRef}
					tabIndex={-1}
					role="dialog"
					aria-modal="true"
					id="game-log-panel"
					aria-labelledby="game-log-title"
					className={panelClasses}
				>
					<div ref={scrollRef} className={scrollContainerClasses}>
						<div className="flex items-start gap-2">
							<h2
								id="game-log-title"
								className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
							>
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
									'text-sm font-mono leading-relaxed',
									'whitespace-pre-wrap',
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
		</div>
	);
}
