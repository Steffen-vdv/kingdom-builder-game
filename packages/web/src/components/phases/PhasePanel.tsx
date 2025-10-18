import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

const panelClassName = [
	'relative flex min-h-[240px] w-full flex-col gap-6 rounded-3xl',
	'border border-white/60 bg-white/80 p-6 shadow-2xl',
	'dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50',
].join(' ');

const turnClassName = [
	'flex flex-wrap items-center gap-2 text-sm font-semibold uppercase',
	'tracking-[0.2em] text-slate-600 dark:text-slate-300',
].join(' ');

const playerBadgeClassName = [
	'rounded-full bg-white/60 px-3 py-1 text-xs font-medium uppercase',
	'tracking-[0.15em] text-slate-500 dark:bg-white/10 dark:text-slate-200',
].join(' ');

const phaseBadgeClassName = [
	'inline-flex items-center gap-3 self-start rounded-full border px-4 py-2',
	'border-slate-300 bg-white/70 text-sm font-semibold uppercase tracking-[0.2em]',
	'text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80',
	'dark:text-slate-100',
].join(' ');

const phaseListClassName = [
	'flex flex-col gap-3 rounded-2xl border border-white/40 bg-white/50 p-3',
	'dark:border-white/5 dark:bg-slate-900/60',
].join(' ');

const phaseItemClassName = [
	'flex items-center justify-between rounded-xl border px-4 py-3',
	'bg-white/70 text-slate-700 transition-colors',
	'dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100',
].join(' ');

const activePhaseClassName = [
	'border-amber-400 bg-amber-100/70 text-amber-900 shadow-sm',
	'dark:border-amber-300/70 dark:bg-amber-500/20 dark:text-amber-100',
].join(' ');

const phaseLabelClassName = [
	'flex items-center gap-3 text-base font-semibold tracking-tight',
].join(' ');

const phaseStatusClassName = [
	'rounded-full border px-3 py-1 text-xs font-semibold uppercase',
	'tracking-[0.2em] border-transparent text-slate-500 dark:text-slate-300',
].join(' ');

const PhasePanel = React.forwardRef<HTMLDivElement>((_, ref) => {
	const { sessionState, sessionView, phase, handleEndTurn } = useGameEngine();
	const currentPhaseDefinition = useMemo(
		() =>
			sessionState.phases.find(
				(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
			),
		[phase.currentPhaseId, sessionState.phases],
	);
	const activePlayerName =
		sessionView.active?.name ?? sessionState.game.players[0]?.name ?? 'Player';
	const canEndTurn = phase.canEndTurn && !phase.isAdvancing;
	const handleEndTurnClick = () => {
		// Phase errors are surfaced via onFatalSessionError inside
		// usePhaseProgress.
		void handleEndTurn();
	};
	return (
		<section ref={ref} className={panelClassName}>
			<header className="flex flex-col gap-3">
				<p className={turnClassName}>
					<span>Turn {sessionState.game.turn}</span>
					<span className="sr-only">Active player:</span>
					<span className={playerBadgeClassName}>{activePlayerName}</span>
				</p>
				<span className={phaseBadgeClassName} role="status" aria-live="polite">
					<span className="text-[0.65rem] text-slate-500 dark:text-slate-300">
						Current Phase
					</span>
					<span className="flex items-center gap-2 text-base">
						<span aria-hidden="true">
							{currentPhaseDefinition?.icon ?? '•'}
						</span>
						<span>{currentPhaseDefinition?.label ?? phase.currentPhaseId}</span>
					</span>
				</span>
			</header>
			<ol className={phaseListClassName}>
				{sessionState.phases.map((phaseDefinition) => {
					const isActive = phaseDefinition.id === phase.currentPhaseId;
					const itemClassName = [
						phaseItemClassName,
						isActive ? activePhaseClassName : null,
					]
						.filter(Boolean)
						.join(' ');
					return (
						<li
							key={phaseDefinition.id}
							className={itemClassName}
							aria-current={isActive ? 'step' : undefined}
						>
							<span className={phaseLabelClassName}>
								<span className="text-xl" aria-hidden="true">
									{phaseDefinition.icon ?? '•'}
								</span>
								<span>{phaseDefinition.label ?? phaseDefinition.id}</span>
							</span>
							<span className={phaseStatusClassName}>
								<span className="sr-only">
									{isActive ? 'Current phase' : 'Upcoming phase'}:
								</span>
								<span aria-hidden="true">
									{isActive ? 'Active' : 'Pending'}
								</span>
							</span>
						</li>
					);
				})}
			</ol>
			<div className="mt-auto flex justify-end">
				<Button
					variant="primary"
					disabled={!canEndTurn}
					onClick={handleEndTurnClick}
					icon="⏭️"
				>
					Next Turn
				</Button>
			</div>
		</section>
	);
});

PhasePanel.displayName = 'PhasePanel';

export default PhasePanel;
