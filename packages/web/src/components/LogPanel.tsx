import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { ResolutionCard } from './ResolutionCard';
import { useGameEngine } from '../state/GameContext';
import type { ResolutionLogEntry, TextLogEntry } from '../state/useGameLog';
import { useAnimate } from '../utils/useAutoAnimate';

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
	const listClasses = clsx('mt-6 flex flex-col gap-6');
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
	const timestampClasses = clsx(
		'text-xs font-semibold uppercase tracking-[0.3em]',
		'text-slate-500 dark:text-slate-400',
	);
	const entryContainerClasses = clsx('flex flex-col gap-3');
	const cardWrapperBaseClasses = clsx('log-entry-card');
	const fallbackContainerClasses = clsx(
		'rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl',
		'shadow-amber-500/10 dark:border-white/10 dark:bg-slate-900/80',
		'dark:shadow-slate-900/60 frosted-surface',
	);
	const fallbackTextClasses = clsx(
		'text-sm text-slate-700 dark:text-slate-200',
		'whitespace-pre-wrap',
	);
	const renderTextEntry = (
		entry: TextLogEntry,
		entryElementId: string,
		cardClasses: string,
	) => (
		<div key={entry.id} id={entryElementId} className={entryContainerClasses}>
			<div className={timestampClasses}>{entry.time}</div>
			<div className={cardClasses}>
				<div className={fallbackContainerClasses}>
					<p className={fallbackTextClasses}>{entry.text}</p>
				</div>
			</div>
		</div>
	);
	const renderResolutionEntry = (
		entry: ResolutionLogEntry,
		entryElementId: string,
		cardClasses: string,
	) => {
		const resolutionTestId = `log-resolution-card-${entry.id}`;
		return (
			<div key={entry.id} id={entryElementId} className={entryContainerClasses}>
				<div className={timestampClasses}>{entry.time}</div>
				<div className={cardClasses} data-testid={resolutionTestId}>
					<ResolutionCard resolution={entry.resolution} onContinue={() => {}} />
				</div>
			</div>
		);
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
					const colorClass =
						entry.playerId === aId
							? 'log-entry-a'
							: entry.playerId === bId
								? 'log-entry-b'
								: '';
					const entryElementId = `game-log-entry-${entry.id}`;
					const cardClasses = clsx(cardWrapperBaseClasses, colorClass);
					if (entry.kind !== 'resolution') {
						if (!entry.text) {
							return null;
						}
						return renderTextEntry(entry, entryElementId, cardClasses);
					}
					return renderResolutionEntry(entry, entryElementId, cardClasses);
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
