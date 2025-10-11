import React, { useMemo } from 'react';
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
			actionCostResource,
			tabsEnabled,
			handleEndTurn,
		} = useGameEngine();
		const { game, phases } = sessionState;
		const actionPhaseId = useMemo(() => {
			const phaseWithAction = phases.find((phase) => phase.action);
			return phaseWithAction?.id;
		}, [phases]);
		const currentPhase = useMemo(
			() => phases.find((phase) => phase.id === game.currentPhase),
			[phases, game.currentPhase],
		);
		const isActionPhase = isActionPhaseActive(
			game.currentPhase,
			actionPhaseId,
			tabsEnabled,
		);
		const activePlayer = game.players.find(
			(player) => player.id === game.activePlayerId,
		);
		const remainingActions = activePlayer?.resources[actionCostResource] ?? 0;
		const canAdvanceTurn =
			isActionPhase && !game.conclusion && remainingActions <= 0;
		const playerName =
			sessionView.active?.name ?? game.players[0]?.name ?? 'Player';
		const panelHeight = height ? Math.max(160, height) : 0;
		const handleNextTurnClick = () => {
			if (!canAdvanceTurn) {
				return;
			}
			void handleEndTurn();
		};
		return (
			<section
				ref={ref}
				className="relative flex min-h-[160px] w-full flex-col justify-center gap-4 rounded-3xl border border-white/60 bg-white/75 px-6 py-6 text-sm shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-slate-900/50 frosted-surface"
				style={panelHeight ? { height: `${panelHeight}px` } : undefined}
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:gap-3">
						<div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
							<span>Turn {game.turn}</span>
							<span
								className="rounded-full bg-white/60 px-2 py-1 text-[0.65rem] font-medium tracking-[0.2em] text-slate-500 dark:bg-white/10 dark:text-slate-300"
								aria-label="Active player"
							>
								{playerName}
							</span>
						</div>
						{currentPhase ? (
							<span
								className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:border-indigo-300/40 dark:bg-indigo-500/20 dark:text-indigo-200"
								aria-label="Current phase"
							>
								<span aria-hidden="true">{currentPhase.icon}</span>
								<span className="tracking-[0.2em]">
									{currentPhase.label ?? currentPhase.id}
								</span>
							</span>
						) : null}
					</div>
					<Button
						variant="primary"
						disabled={!canAdvanceTurn}
						onClick={handleNextTurnClick}
						aria-label="Advance to the next turn"
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
