import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

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
	'text-sm font-medium tracking-[0.08em] text-slate-600 transition-colors',
	'bg-white/70 shadow-sm dark:border-white/10 dark:bg-slate-900/60',
	'dark:text-slate-100',
	'data-[active=true]:border-indigo-500 data-[active=true]:bg-indigo-50/80',
	'data-[active=true]:text-indigo-800 dark:data-[active=true]:border-indigo-300/60',
	'dark:data-[active=true]:bg-indigo-500/20 dark:data-[active=true]:text-white',
].join(' ');

const phaseListItemContentClassName = ['flex w-full items-center gap-3'].join(
	' ',
);

const phaseListItemIndexClassName = [
	'relative flex h-12 w-12 flex-col items-center justify-center gap-1',
	'overflow-hidden rounded-2xl border border-indigo-200/70',
	'bg-gradient-to-br from-white via-white/80 to-indigo-50/70 text-indigo-700',
	'shadow-sm transition-[border,box-shadow,transform] duration-200 ease-out',
	'data-[active=true]:-translate-y-0.5 data-[active=true]:border-indigo-400',
	'data-[active=true]:shadow-lg data-[active=true]:shadow-indigo-400/30',
	'dark:border-indigo-400/30 dark:from-indigo-950/20 dark:via-indigo-900/30',
	'dark:to-indigo-800/40 dark:text-indigo-100',
	'dark:data-[active=true]:border-indigo-300/60',
	'dark:data-[active=true]:shadow-indigo-500/30',
].join(' ');

const phaseListItemIndexAccentClassName = [
	'pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-200',
	'bg-gradient-to-br from-indigo-500/20 via-transparent to-indigo-500/10',
	'data-[active=true]:opacity-100',
	'dark:from-indigo-200/20 dark:via-transparent dark:to-indigo-400/15',
].join(' ');

const phaseListItemIndexLabelClassName = [
	'relative text-[0.5rem] uppercase tracking-[0.45em] text-indigo-400',
	'transition-colors data-[active=true]:text-indigo-50',
	'dark:text-indigo-200/70 dark:data-[active=true]:text-indigo-100/80',
].join(' ');

const phaseListItemIndexNumberClassName = [
	'relative text-lg font-semibold leading-none tracking-[0.15em]',
	'text-indigo-700 transition-colors data-[active=true]:text-white',
	'dark:text-indigo-100 dark:data-[active=true]:text-white',
].join(' ');

const phaseListItemIconClassName = [
	'grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-base',
	'text-indigo-600 shadow-inner dark:bg-white/10 dark:text-indigo-200',
].join(' ');

const phaseListItemLabelClassName = [
	'flex-1 text-xs uppercase tracking-[0.2em]',
].join(' ');

export default function PhasePanel() {
	const { sessionSnapshot, selectors, phase, requests, resolution } =
		useGameEngine();
	const { sessionView } = selectors;
	const phases = useMemo(
		() =>
			sessionSnapshot.phases.map((phaseDefinition) => ({
				id: phaseDefinition.id,
				label: phaseDefinition.label ?? phaseDefinition.id,
				icon: phaseDefinition.icon?.trim() ?? '',
			})),
		[sessionSnapshot.phases],
	);
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
	const activePlayerName =
		phase.activePlayerName ??
		sessionView.active?.name ??
		activePlayerSnapshot?.name ??
		'Player';
	const canEndTurn = phase.canEndTurn && !phase.isAdvancing;
	const shouldHideNextTurn = Boolean(resolution?.requireAcknowledgement);
	const handleEndTurnClick = () => {
		// Phase errors are surfaced via onFatalSessionError inside
		// usePhaseProgress.
		void requests.advancePhase();
	};
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
						const isActive = phaseDefinition.id === phase.currentPhaseId;
						return (
							<li
								key={phaseDefinition.id}
								className={phaseListItemClassName}
								data-active={isActive ? 'true' : 'false'}
								aria-current={isActive ? 'step' : undefined}
							>
								<span className={phaseListItemContentClassName}>
									<span
										className={phaseListItemIndexClassName}
										aria-hidden="true"
										data-active={isActive ? 'true' : 'false'}
									>
										<span
											className={phaseListItemIndexAccentClassName}
											aria-hidden="true"
											data-active={isActive ? 'true' : 'false'}
										/>
										<span
											className={phaseListItemIndexLabelClassName}
											data-active={isActive ? 'true' : 'false'}
										>
											Phase
										</span>
										<span
											className={phaseListItemIndexNumberClassName}
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
			{shouldHideNextTurn ? null : (
				<div className="flex justify-end pt-2">
					<Button
						variant="primary"
						disabled={!canEndTurn}
						onClick={handleEndTurnClick}
						icon="⏭️"
					>
						Next Turn
					</Button>
				</div>
			)}
		</section>
	);
}
