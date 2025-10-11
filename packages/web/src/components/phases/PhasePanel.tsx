import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

type PhasePanelProps = {
	height?: number;
};

const PhasePanel = React.forwardRef<HTMLDivElement, PhasePanelProps>(
	({ height }, ref) => {
		const { sessionState, sessionView, phase, handleEndTurn } = useGameEngine();
		const actionPhaseId = useMemo(() => {
			const phaseWithAction = sessionState.phases.find(
				(phaseDefinition) => phaseDefinition.action,
			);
			return phaseWithAction?.id;
		}, [sessionState.phases]);
		const currentPhaseDefinition = useMemo(
			() =>
				sessionState.phases.find(
					(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
				),
			[phase.currentPhaseId, sessionState.phases],
		);
		const phaseStatus = phase.isAdvancing
			? 'Advancing through phases…'
			: phase.isActionPhase
				? phase.currentPhaseId === actionPhaseId
					? 'Spend remaining actions or end the turn.'
					: 'Preparing the action phase.'
				: 'Resolving phase effects.';
		const canEndTurn = phase.canEndTurn && !phase.isAdvancing;
		const handleEndTurnClick = () => {
			void handleEndTurn();
		};
		const panelHeight = Math.max(320, height ?? 0);
		return (
			<section
				ref={ref}
				className="relative flex min-h-[320px] w-full flex-col gap-4 rounded-3xl border border-white/60 bg-white/75 px-6 py-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50 frosted-surface"
				style={{ height: `${panelHeight}px` }}
			>
				<header className="flex flex-col gap-3">
					<div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
						<span>Turn {sessionState.game.turn}</span>
						<span className="rounded-full bg-white/60 px-2 py-1 text-[0.65rem] font-medium tracking-[0.2em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
							{sessionView.active?.name ??
								sessionState.game.players[0]?.name ??
								'Player'}
						</span>
					</div>
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
							Current Phase
						</p>
						<p className="text-lg font-bold text-slate-900 dark:text-white">
							{currentPhaseDefinition?.label ?? phase.currentPhaseId}
						</p>
						<p className="text-sm text-slate-600 dark:text-slate-300">
							{phaseStatus}
						</p>
					</div>
				</header>
				<ul className="flex flex-col gap-2">
					{sessionState.phases.map((entry) => {
						const isCurrent = entry.id === phase.currentPhaseId;
						const itemClasses = [
							'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm shadow-sm transition-colors',
							isCurrent
								? 'border-blue-500/50 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-slate-900 dark:border-indigo-400/40 dark:from-blue-500/30 dark:to-indigo-500/30 dark:text-white'
								: 'border-white/40 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200',
						].join(' ');
						return (
							<li key={entry.id} className={itemClasses}>
								<span className="flex items-center gap-2">
									<span className="text-lg" aria-hidden>
										{entry.icon}
									</span>
									<span className="font-semibold uppercase tracking-[0.15em]">
										{entry.label}
									</span>
								</span>
								{entry.action && (
									<span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
										Action Phase
									</span>
								)}
							</li>
						);
					})}
				</ul>
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
