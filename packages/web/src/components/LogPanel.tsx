import React, { useCallback, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useGameEngine } from '../state/GameContext';
import { resolvePlayerAccentKey } from '../utils/playerAccent';
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
	const noop = useCallback(() => {}, []);
	const accentClassForPlayer = useCallback(
		(playerId: string) => {
			const accentKey = resolvePlayerAccentKey(
				sessionSnapshot.game.players,
				playerId,
			);
			switch (accentKey) {
				case 'primary':
					return clsx(
						'border-blue-400/50',
						'shadow-[0_18px_48px_rgba(37,99,235,0.25)]',
						'dark:border-blue-300/40',
						'dark:shadow-[0_24px_54px_rgba(37,99,235,0.35)]',
					);
				case 'secondary':
					return clsx(
						'border-rose-400/50',
						'shadow-[0_18px_48px_rgba(190,18,60,0.25)]',
						'dark:border-rose-300/40',
						'dark:shadow-[0_24px_54px_rgba(244,63,94,0.35)]',
					);
				default:
					return clsx(
						'border-slate-300/40',
						'shadow-[0_18px_48px_rgba(15,23,42,0.18)]',
						'dark:border-slate-500/40',
						'dark:shadow-[0_24px_48px_rgba(15,23,42,0.4)]',
					);
			}
		},
		[sessionSnapshot.game.players],
	);
	const resolvePlayerName = useCallback(
		(playerId: string, fallback?: string | null) => {
			const player = sessionSnapshot.game.players.find(
				(candidate) => candidate.id === playerId,
			);
			if (player?.name?.trim()) {
				return player.name;
			}
			if (fallback?.trim()) {
				return fallback;
			}
			return player?.id ?? null;
		},
		[sessionSnapshot.game.players],
	);

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
	const listClasses = 'mt-4 flex flex-col gap-6';
	const entryWrapperClass = 'space-y-3';
	const entryHeaderClasses =
		'flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400';
	const entryTimeClasses =
		'font-mono tracking-[0.25em] text-slate-500 dark:text-slate-400';
	const entryPlayerClasses =
		'text-[0.7rem] font-semibold tracking-[0.25em] text-slate-600 dark:text-slate-300';
	const entryContainerBaseClasses =
		'rounded-[1.875rem] border border-white/40 bg-white/70 p-1.5 shadow-lg backdrop-blur-sm transition-shadow dark:border-white/10 dark:bg-slate-900/60 dark:shadow-[0_24px_48px_rgba(0,0,0,0.45)]';
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
			<div ref={listRef} className={listClasses} role="list">
				{entries.map((entry) => {
					const accentClass = accentClassForPlayer(entry.playerId);
					const entryContainerClasses = clsx(
						entryContainerBaseClasses,
						accentClass,
					);
					const playerName = resolvePlayerName(
						entry.playerId,
						entry.resolution.player?.name ??
							entry.resolution.player?.id ??
							null,
					);
					const header = (
						<div className={entryHeaderClasses} data-log-entry-header>
							<span className={entryTimeClasses}>{entry.time}</span>
							{playerName ? (
								<>
									<span aria-hidden="true" className="text-slate-400">
										—
									</span>
									<span className={entryPlayerClasses}>{playerName}</span>
								</>
							) : null}
						</div>
					);
					return (
						<article
							key={entry.id}
							id={`game-log-entry-${entry.id}`}
							data-log-entry-id={entry.id}
							data-log-entry-kind={entry.kind}
							className={entryWrapperClass}
							role="listitem"
						>
							{header}
							<div className={entryContainerClasses}>
								<ResolutionCard
									resolution={entry.resolution}
									onContinue={noop}
								/>
							</div>
						</article>
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
