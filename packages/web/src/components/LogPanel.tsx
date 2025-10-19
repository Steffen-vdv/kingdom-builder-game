import React, { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';
import { ResolutionCard } from './ResolutionCard';

interface LogPanelProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function LogPanel({ isOpen, onClose }: LogPanelProps) {
	const { log: entries, logOverflowed, sessionSnapshot } = useGameEngine();
	const containerRef = useRef<HTMLDivElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const listRef = useAnimate<HTMLDivElement>();
	const pendingScrollRef = useRef(false);
	const acknowledgeLogResolution = useCallback(() => {}, []);

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
	const listClasses = clsx('mt-4 flex flex-col gap-6');
	const entryContainerClasses = clsx('player-log-entry flex flex-col gap-3');
	const entryHeaderClasses = clsx(
		'flex items-center justify-between gap-3',
		'text-[0.6875rem] font-semibold uppercase tracking-[0.3em]',
		'text-slate-500 dark:text-slate-400',
	);
	const entryHeaderPlayerClasses = clsx(
		'text-[0.6875rem] font-medium uppercase tracking-[0.3em]',
		'text-slate-400 dark:text-slate-500',
	);
	const legacyTextClasses = clsx(
		'rounded-3xl border border-white/60 bg-white/80 p-4 text-sm',
		'text-slate-700 shadow-inner shadow-amber-500/10 whitespace-pre-wrap',
		'dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200',
	);
	const closeButtonClasses = clsx(
		'flex h-8 w-8 items-center justify-center rounded-full border',
		'border-rose-500 bg-rose-500 text-base font-semibold leading-none text-white',
		'transition hover:border-rose-600 hover:bg-rose-600',
		'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
		'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100',
		'dark:border-rose-400 dark:bg-rose-500 dark:hover:bg-rose-400',
		'dark:focus-visible:ring-offset-slate-900 cursor-pointer',
	);
	const closeButtonProps = {
		type: 'button' as const,
		className: closeButtonClasses,
		title: 'Close log',
		'aria-label': 'Close log',
	};
	const overlayClasses = clsx(
		'absolute inset-0 flex items-start justify-center px-4 py-12',
		'sm:px-8 sm:py-16 lg:justify-end pointer-events-none',
	);
	const titleClasses = clsx(
		'text-xl font-semibold tracking-tight',
		'text-slate-900 dark:text-slate-100',
	);
	const overflowMessageClasses = clsx(
		'mt-2 text-xs italic text-amber-700',
		'dark:text-amber-300',
	);
	const headerClasses = clsx('flex items-start justify-between gap-6');
	const header = (
		<div className={headerClasses}>
			<h2 id="game-log-title" className={titleClasses}>
				Log
			</h2>
			<button {...closeButtonProps} onClick={onClose}>
				<span aria-hidden="true">×</span>
			</button>
		</div>
	);
	const overflowNotice = logOverflowed ? (
		<p className={overflowMessageClasses}>Older log entries were trimmed.</p>
	) : null;
	const backdropClasses = clsx(
		'absolute inset-0 pointer-events-auto',
		'bg-slate-900/20 backdrop-blur-sm',
	);
	const handleBackdropKeyDown = (
		event: React.KeyboardEvent<HTMLButtonElement>,
	) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			onClose();
		}
	};
	const logContent = (
		<>
			{header}
			{overflowNotice}
			<div ref={listRef} className={listClasses}>
				{entries.map((entry) => {
					const [playerA, playerB] = sessionSnapshot.game.players;
					const aId = playerA?.id;
					const bId = playerB?.id;
					if (entry.kind === 'resolution') {
						const resolutionPlayerName =
							entry.resolution.player?.name ??
							entry.resolution.player?.id ??
							null;
						let resolutionCardClass = 'ring-1 ring-inset ring-white/20';
						if (entry.playerId === aId) {
							resolutionCardClass = clsx(
								'border-blue-500/40',
								'shadow-blue-500/20',
								'ring-1 ring-inset ring-blue-500/20',
								'dark:border-blue-300/40',
								'dark:shadow-blue-900/40',
								'dark:ring-blue-300/30',
							);
						} else if (entry.playerId === bId) {
							resolutionCardClass = clsx(
								'border-rose-500/40',
								'shadow-rose-500/25',
								'ring-1 ring-inset ring-rose-500/20',
								'dark:border-rose-300/40',
								'dark:shadow-rose-900/40',
								'dark:ring-rose-300/30',
							);
						}
						return (
							<section
								key={entry.id}
								id={`game-log-entry-${entry.id}`}
								className={entryContainerClasses}
							>
								<header className={entryHeaderClasses}>
									<time dateTime={entry.time}>{entry.time}</time>
									{resolutionPlayerName ? (
										<span className={entryHeaderPlayerClasses}>
											{resolutionPlayerName}
										</span>
									) : null}
								</header>
								<ResolutionCard
									resolution={entry.resolution}
									onContinue={acknowledgeLogResolution}
									className={resolutionCardClass}
								/>
							</section>
						);
					}

					return (
						<section
							key={entry.id}
							id={`game-log-entry-${entry.id}`}
							className={entryContainerClasses}
						>
							<header className={entryHeaderClasses}>
								<time dateTime={entry.time}>{entry.time}</time>
							</header>
							<div className={legacyTextClasses}>{entry.text}</div>
						</section>
					);
				})}
			</div>
		</>
	);

	return (
		<div className="fixed inset-0 z-40">
			<button
				type="button"
				className={backdropClasses}
				aria-label="Close log overlay"
				onClick={onClose}
				onKeyDown={handleBackdropKeyDown}
			/>
			<div className={overlayClasses}>
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
						{logContent}
					</div>
				</div>
			</div>
		</div>
	);
}
