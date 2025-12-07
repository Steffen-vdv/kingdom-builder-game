import React, { useCallback, useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import { useAdvanceAction } from '../../state/useAdvanceAction';
import type { ActionResolution } from '../../state/useActionResolution';
import Button from '../common/Button';

function normalizePhaseKey(id?: string, label?: string) {
	const trimmedId = id?.trim();
	if (trimmedId && trimmedId.length > 0) {
		return trimmedId;
	}
	const trimmedLabel = label?.trim();
	if (trimmedLabel && trimmedLabel.length > 0) {
		return trimmedLabel;
	}
	return null;
}

interface PhaseSummary {
	id: string;
	label: string;
	icon: string;
	historyKey: string;
	isActionPhase: boolean;
}

const panelClassName = [
	'relative flex w-full flex-col gap-6 rounded-3xl border border-white/40',
	'bg-gradient-to-br from-white/80 via-white/70 to-white/40 p-6 shadow-xl',
	'backdrop-blur dark:border-white/10 dark:from-slate-900/80',
	'dark:via-slate-900/70 dark:to-slate-900/60 dark:shadow-slate-900/40',
].join(' ');

const headerClassName = [
	'flex flex-wrap items-center justify-between gap-4',
].join(' ');

const turnSummaryClassName = [
	'flex flex-wrap items-center gap-4 rounded-2xl border border-white/60 px-4',
	'py-3 text-sm text-slate-700 shadow-sm dark:border-white/10',
	'dark:text-slate-100',
].join(' ');

const turnBadgeClassName = [
	'flex items-center gap-2 rounded-xl bg-indigo-600/90 px-3 py-1',
	'text-xs font-semibold uppercase tracking-[0.25em] text-white shadow',
].join(' ');

const playerDetailsClassName = ['flex flex-col gap-0.5 text-left'].join(' ');

const playerLabelClassName = [
	'uppercase tracking-[0.3em] text-[0.625rem] text-slate-500',
	'dark:text-slate-300',
].join(' ');

const playerNameClassName = [
	'text-base font-semibold text-slate-800 dark:text-white',
].join(' ');

const phaseSectionClassName = ['flex flex-col gap-3'].join(' ');

const phaseListClassName = [
	'grid gap-3',
	'sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-3',
].join(' ');

const phaseListItemClassName = [
	'flex items-center rounded-2xl border border-white/40 px-3 py-2 text-left',
	'text-sm font-medium tracking-[0.08em] text-slate-600 transition-all',
	'duration-200 ease-out bg-white/70 shadow-sm dark:border-white/10',
	'dark:bg-slate-900/60 dark:text-slate-100 hover:-translate-y-0.5',
	'hover:bg-white/60 hover:shadow-lg hover:shadow-amber-500/10',
	'dark:hover:bg-white/10 dark:hover:shadow-black/30',
	'data-[active=true]:border-indigo-500 data-[active=true]:bg-indigo-50/80',
	'data-[active=true]:text-indigo-800',
	'data-[active=true]:hover:bg-indigo-50/80',
	'data-[active=true]:hover:shadow-lg',
	'dark:data-[active=true]:border-indigo-300/60',
	'dark:data-[active=true]:bg-indigo-500/20',
	'dark:data-[active=true]:text-white',
	'dark:data-[active=true]:hover:bg-indigo-500/20',
].join(' ');

const phaseListItemContentClassName = ['flex w-full items-center gap-3'].join(
	' ',
);

const phaseListItemIndexWrapperClassName = [
	'relative grid h-10 w-10 place-items-center overflow-hidden rounded-2xl',
	'bg-white/70 shadow-inner shadow-white/60 ring-1 ring-inset ring-white/70',
	'backdrop-blur-[2px] transition-all duration-300 ease-out',
	'dark:bg-white/10 dark:shadow-black/40 dark:ring-white/10',
	'data-[active=true]:bg-gradient-to-br data-[active=true]:from-indigo-500/90',
	'data-[active=true]:via-indigo-500/80 data-[active=true]:to-fuchsia-500/80',
	'data-[active=true]:shadow-lg data-[active=true]:ring-indigo-200/80',
	'dark:data-[active=true]:ring-indigo-300/60',
].join(' ');

const phaseListItemIndexHighlightClassName = [
	'pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br',
	'from-white/70 via-white/30 to-transparent opacity-0 transition-opacity',
	'duration-300 ease-out data-[active=true]:opacity-60',
	'dark:from-white/40 dark:via-white/5',
].join(' ');

const phaseListItemIndexTextClassName = [
	'relative text-xs font-semibold uppercase tracking-[0.35em]',
	'text-indigo-600 transition-colors duration-300 ease-out',
	'data-[active=true]:text-white dark:text-indigo-200',
	'dark:data-[active=true]:text-white font-mono tabular-nums',
].join(' ');

const phaseListItemIconClassName = [
	'grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-base',
	'text-indigo-600 shadow-inner dark:bg-white/10 dark:text-indigo-200',
].join(' ');

const phaseListItemLabelClassName = [
	'flex-1 text-xs uppercase tracking-[0.2em]',
].join(' ');

export default function PhasePanel() {
	const {
		sessionSnapshot,
		selectors,
		phase,
		resolution,
		log,
		handleHoverCard,
		clearHoverCard,
	} = useGameEngine();
	const { mode: advanceMode, advance } = useAdvanceAction();
	const { sessionView } = selectors;
	const phases = useMemo<PhaseSummary[]>(
		() =>
			sessionSnapshot.phases.map((phaseDefinition) => {
				const trimmedLabel = phaseDefinition.label?.trim();
				const resolvedLabel =
					trimmedLabel && trimmedLabel.length > 0
						? trimmedLabel
						: phaseDefinition.id;
				const historyKey =
					normalizePhaseKey(phaseDefinition.id, phaseDefinition.label) ??
					phaseDefinition.id;
				return {
					id: phaseDefinition.id,
					label: resolvedLabel,
					icon: phaseDefinition.icon?.trim() ?? '',
					historyKey,
					isActionPhase: Boolean(phaseDefinition.action),
				};
			}),
		[sessionSnapshot.phases],
	);
	const phaseHistory = useMemo(() => {
		const byPhase = new Map<string, ActionResolution>();
		const byPlayer = new Map<string, ActionResolution>();
		for (let index = log.length - 1; index >= 0; index -= 1) {
			const entry = log[index];
			if (!entry) {
				continue;
			}
			const source = entry.resolution.source;
			if (!source || typeof source !== 'object') {
				continue;
			}
			if (source.kind !== 'phase') {
				continue;
			}
			const historyKey = normalizePhaseKey(source.id, source.label);
			if (!historyKey) {
				continue;
			}
			if (!byPhase.has(historyKey)) {
				byPhase.set(historyKey, entry.resolution);
			}
			const playerKey = `${entry.playerId}::${historyKey}`;
			if (!byPlayer.has(playerKey)) {
				byPlayer.set(playerKey, entry.resolution);
			}
		}
		return { byPhase, byPlayer };
	}, [log]);
	const currentPhaseLabel = useMemo(
		() =>
			phases.find(
				(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
			)?.label ?? phase.currentPhaseId,
		[phases, phase.currentPhaseId],
	);
	const activePlayerSnapshot = useMemo(() => {
		if (phase.activePlayerId) {
			return sessionSnapshot.game.players.find(
				(player) => player.id === phase.activePlayerId,
			);
		}
		return sessionSnapshot.game.players[0];
	}, [phase.activePlayerId, sessionSnapshot.game.players]);
	const activePlayerId = activePlayerSnapshot?.id ?? null;
	const activePlayerName =
		phase.activePlayerName ??
		sessionView.active?.name ??
		activePlayerSnapshot?.name ??
		'Player';
	const shouldHideControls = Boolean(resolution?.requireAcknowledgement);
	const shouldSuppressHoverCards = useMemo(
		() =>
			Boolean(
				resolution &&
				(!resolution.requireAcknowledgement || !resolution.isComplete),
			),
		[resolution],
	);
	const showPhaseHistory = useCallback(
		(phaseSummary: PhaseSummary, resolution: ActionResolution | null) => {
			if (phaseSummary.isActionPhase || !resolution) {
				clearHoverCard();
				return;
			}
			const baseLabel = phaseSummary.label;
			const resolutionTitle = `${baseLabel} resolution`;
			handleHoverCard({
				title: resolutionTitle,
				resolutionTitle,
				resolution,
				effects: [],
				requirements: [],
			});
		},
		[clearHoverCard, handleHoverCard],
	);
	const hidePhaseHistory = useCallback(() => {
		clearHoverCard();
	}, [clearHoverCard]);

	// Show "Let's Go" button when in start mode and controls aren't hidden
	const shouldShowManualStartButton =
		advanceMode === 'start' && !shouldHideControls;
	return (
		<section className={panelClassName}>
			<header className={headerClassName}>
				<div className={turnSummaryClassName}>
					<span className={turnBadgeClassName}>
						<span className="text-[0.6rem] uppercase tracking-[0.45em]">
							Turn
						</span>
						<span className="text-base tracking-[0.15em]">
							{phase.turnNumber}
						</span>
					</span>
					<span className="sr-only">Active player:</span>
					<div className={playerDetailsClassName}>
						<span className={playerLabelClassName}>Active Player</span>
						<span className={playerNameClassName}>{activePlayerName}</span>
					</div>
				</div>
				<span className="sr-only" role="status" aria-live="polite">
					Current phase: {currentPhaseLabel}
				</span>
			</header>
			<div className={phaseSectionClassName}>
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
					Phases
				</p>
				<ul className={phaseListClassName}>
					{phases.map((phaseDefinition, phaseIndex) => {
						const historyKey = phaseDefinition.historyKey;
						const playerKey = activePlayerId
							? `${activePlayerId}::${historyKey}`
							: null;
						const phaseResolution =
							(playerKey ? phaseHistory.byPlayer.get(playerKey) : undefined) ??
							phaseHistory.byPhase.get(historyKey) ??
							null;
						const isActive = phaseDefinition.id === phase.currentPhaseId;
						const shouldShowHoverIndicator =
							Boolean(phaseResolution) &&
							!phaseDefinition.isActionPhase &&
							!shouldSuppressHoverCards;
						const resolvedPhaseListItemClassName = [
							phaseListItemClassName,
							shouldShowHoverIndicator ? 'hoverable cursor-help' : '',
						]
							.filter(Boolean)
							.join(' ');
						const handlePhaseMouseEnter = shouldShowHoverIndicator
							? () => showPhaseHistory(phaseDefinition, phaseResolution)
							: hidePhaseHistory;
						return (
							<li
								key={phaseDefinition.id}
								className={resolvedPhaseListItemClassName}
								data-active={isActive ? 'true' : 'false'}
								aria-current={isActive ? 'step' : undefined}
								onMouseEnter={handlePhaseMouseEnter}
								onMouseLeave={hidePhaseHistory}
							>
								<span className={phaseListItemContentClassName}>
									<span
										className={phaseListItemIndexWrapperClassName}
										data-active={isActive ? 'true' : 'false'}
										aria-hidden="true"
									>
										<span
											className={phaseListItemIndexHighlightClassName}
											data-active={isActive ? 'true' : 'false'}
											aria-hidden="true"
										/>
										<span
											className={phaseListItemIndexTextClassName}
											data-active={isActive ? 'true' : 'false'}
										>
											{String(phaseIndex + 1).padStart(2, '0')}
										</span>
									</span>
									<span
										className={phaseListItemIconClassName}
										aria-hidden="true"
									>
										{phaseDefinition.icon || '✦'}
									</span>
									<span className={phaseListItemLabelClassName}>
										{phaseDefinition.label}
									</span>
								</span>
							</li>
						);
					})}
				</ul>
			</div>
			{shouldShowManualStartButton ? (
				<div className="flex justify-end pt-2">
					<Button variant="success" onClick={advance} icon="🚀">
						Let's go!
					</Button>
				</div>
			) : null}
		</section>
	);
}
