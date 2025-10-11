import React from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

type PhasePanelProps = {
	height?: number;
};

const MIN_HEIGHT = 320;

const PhasePanel = React.forwardRef<HTMLDivElement, PhasePanelProps>(
	({ height }, ref) => {
		const { sessionState, sessionView, phase, handleEndTurn } = useGameEngine();
		const currentPhaseDefinition = sessionState.phases.find(
			(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
		);
		const activePlayerName =
			sessionView.active?.name ??
			sessionState.game.players[0]?.name ??
			'Player';
		const isAdvancing = phase.isAdvancing;
		const canEndTurn = phase.canEndTurn && !isAdvancing;
		const statusMessage = isAdvancing
			? 'Advancing to the next phase.'
			: canEndTurn
				? 'Ready to end the turn.'
				: 'Action phase in progress.';
		const computedHeight = height ? Math.max(MIN_HEIGHT, height) : undefined;

		return (
			<section
				ref={ref}
				className={[
					'flex min-h-[320px] w-full flex-col justify-between gap-6 rounded-3xl',
					'border border-white/60 bg-white/75 px-6 py-6 shadow-2xl',
					'dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50',
				].join(' ')}
				style={computedHeight ? { height: `${computedHeight}px` } : undefined}
				aria-label="Phase overview"
				aria-busy={isAdvancing}
			>
				<header className="flex flex-col gap-5">
					<div
						className={[
							'flex items-center justify-between rounded-full border border-white/60',
							'bg-white/80 px-5 py-3 text-xs font-semibold uppercase',
							'tracking-[0.3em] text-slate-700 shadow-sm',
							'dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200',
						].join(' ')}
					>
						<span>{`Turn ${sessionState.game.turn}`}</span>
						<span
							className={[
								'rounded-full bg-white/60 px-3 py-1 text-[0.65rem]',
								'font-medium tracking-[0.2em] text-slate-500',
								'dark:bg-white/10 dark:text-slate-300',
							].join(' ')}
							aria-label="Active player"
						>
							{activePlayerName}
						</span>
					</div>
					<div className="flex flex-col gap-2">
						<span
							className={[
								'text-xs font-semibold uppercase tracking-[0.2em]',
								'text-slate-600 dark:text-slate-300',
							].join(' ')}
						>
							Current Phase
						</span>
						<span
							className={[
								'inline-flex items-center gap-2 rounded-full border',
								'border-white/60 bg-white/80 px-4 py-2 text-sm font-semibold',
								'uppercase tracking-[0.15em] text-slate-700 shadow-sm',
								'dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200',
							].join(' ')}
						>
							{currentPhaseDefinition?.icon ? (
								<span aria-hidden className="text-lg">
									{currentPhaseDefinition.icon}
								</span>
							) : null}
							<span>
								{currentPhaseDefinition?.label ?? phase.currentPhaseId}
							</span>
						</span>
					</div>
				</header>
				<span className="sr-only" aria-live="polite">
					{statusMessage}
				</span>
				<div className="mt-auto flex justify-end">
					<Button
						variant="primary"
						disabled={!canEndTurn}
						onClick={() => {
							if (!canEndTurn) {
								return;
							}
							void handleEndTurn();
						}}
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
