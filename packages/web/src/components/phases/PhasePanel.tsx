import React from 'react';
import Button from '../common/Button';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';

type PhasePanelProps = {
	height?: number;
};

const PhasePanel = React.forwardRef<HTMLDivElement, PhasePanelProps>(
	({ height }, ref) => {
		const {
			sessionState,
			sessionView,
			phaseSteps,
			tabsEnabled,
			handleEndTurn,
		} = useGameEngine();

		const actionPhase = sessionState.phases.find(
			(phaseDefinition) => phaseDefinition.action,
		);
		const isActionPhase = isActionPhaseActive(
			sessionState.game.currentPhase,
			actionPhase?.id,
			tabsEnabled,
		);

		const currentPhase = sessionState.phases.find(
			(phaseDefinition) =>
				phaseDefinition.id === sessionState.game.currentPhase,
		);
		const activePlayerName =
			sessionView.active?.name ??
			sessionState.game.players[0]?.name ??
			'Player';

		const hasBlockingStep = phaseSteps.some((step) => step.active);
		const handleEndTurnClick = () => {
			void handleEndTurn();
		};

		const panelHeight = height ? Math.max(160, height) : undefined;

		return (
			<section
				ref={ref}
				className="flex w-full flex-col gap-4 rounded-3xl border border-white/60 bg-white/75 px-6 py-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50"
				style={panelHeight ? { height: `${panelHeight}px` } : undefined}
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div
						className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200"
						aria-label={`Current turn: Turn ${sessionState.game.turn}`}
					>
						<span>Turn {sessionState.game.turn}</span>
						<span className="rounded-full bg-white/60 px-2 py-1 text-[0.65rem] font-medium tracking-[0.2em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
							{activePlayerName}
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<span
							className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200"
							aria-label={
								currentPhase
									? `Current phase: ${currentPhase.label}`
									: 'Current phase'
							}
						>
							{currentPhase?.icon ? (
								<span aria-hidden="true">{currentPhase.icon}</span>
							) : null}
							<span>{currentPhase?.label ?? 'Phase'}</span>
						</span>
						{isActionPhase ? (
							<Button
								variant="primary"
								disabled={hasBlockingStep}
								onClick={handleEndTurnClick}
								icon="⏭️"
							>
								Next Turn
							</Button>
						) : null}
					</div>
				</div>
			</section>
		);
	},
);

export default PhasePanel;
