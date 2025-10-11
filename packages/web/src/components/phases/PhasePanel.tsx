import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

type PhasePanelProps = {
	height?: number;
};

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
	'inline-flex items-center gap-2 self-start rounded-full border px-4 py-2',
	'border-slate-300 bg-white/70 text-sm font-semibold uppercase tracking-[0.2em]',
	'text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80',
	'dark:text-slate-100',
].join(' ');

const PhasePanel = React.forwardRef<HTMLDivElement, PhasePanelProps>(
	({ height }, ref) => {
		const { sessionState, sessionView, phase, handleEndTurn } = useGameEngine();
		const currentPhaseDefinition = useMemo(
			() =>
				sessionState.phases.find(
					(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
				),
			[phase.currentPhaseId, sessionState.phases],
		);
		const activePlayerName =
			sessionView.active?.name ??
			sessionState.game.players[0]?.name ??
			'Player';
		const canEndTurn = phase.canEndTurn && !phase.isAdvancing;
		const handleEndTurnClick = () => {
			void handleEndTurn();
		};
		const panelHeight = Math.max(240, height ?? 0);
		return (
			<section
				ref={ref}
				className={panelClassName}
				style={{ height: `${panelHeight}px` }}
			>
				<header className="flex flex-col gap-3">
					<p className={turnClassName}>
						<span>Turn {sessionState.game.turn}</span>
						<span className="sr-only">Active player:</span>
						<span className={playerBadgeClassName}>{activePlayerName}</span>
					</p>
					<span
						className={phaseBadgeClassName}
						role="status"
						aria-live="polite"
					>
						<span className="text-[0.65rem] text-slate-500 dark:text-slate-300">
							Current Phase
						</span>
						<span>{currentPhaseDefinition?.label ?? phase.currentPhaseId}</span>
					</span>
				</header>
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
	},
);

PhasePanel.displayName = 'PhasePanel';

export default PhasePanel;
