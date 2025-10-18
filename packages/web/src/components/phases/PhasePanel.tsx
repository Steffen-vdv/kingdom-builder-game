import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';

const panelClassName = [
	'relative flex min-h-[240px] w-full flex-col gap-6 rounded-3xl',
	'border border-white/60 bg-white/80 p-6 shadow-2xl',
	'dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50',
].join(' ');

const headerClassName = [
	'flex flex-wrap items-start justify-between gap-3',
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

const phaseBadgeRightClassName = [
	phaseBadgeClassName,
	'ml-auto text-right',
].join(' ');

const panelBodyClassName = ['mt-6 flex flex-col gap-6'].join(' ');

const phaseListClassName = ['grid gap-3'].join(' ');

const phaseItemBaseClassName = [
	'flex items-center justify-between rounded-2xl border px-4 py-3',
	'transition-colors',
].join(' ');

const phaseItemActiveClassName = [
	'border-sky-500 bg-sky-200/80 text-slate-900',
	'dark:border-sky-400 dark:bg-sky-500/20 dark:text-slate-100',
].join(' ');

const phaseItemInactiveClassName = [
	'border-white/40 bg-white/50 text-slate-600',
	'dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300',
].join(' ');

const phaseItemContentClassName = [
	'flex items-center gap-3 text-sm font-semibold uppercase',
	'tracking-[0.2em] text-slate-700 dark:text-slate-100',
].join(' ');

const phaseIconClassName = ['text-base leading-none'].join(' ');

const phaseStatusClassName = [
	'text-xs font-semibold uppercase tracking-[0.3em]',
	'text-slate-500 dark:text-slate-300',
].join(' ');

const phaseStatusActiveClassName = ['text-sky-700 dark:text-sky-200'].join(' ');

const PhasePanel = React.forwardRef<HTMLDivElement, Record<string, never>>(
	(_props, ref) => {
		const { sessionState, sessionView, phase, handleEndTurn, resolution } =
			useGameEngine();
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
		const shouldHideNextTurn = Boolean(resolution?.requireAcknowledgement);
		const handleEndTurnClick = () => {
			// Phase errors are surfaced via onFatalSessionError inside
			// usePhaseProgress.
			void handleEndTurn();
		};
		const phaseIcon = currentPhaseDefinition?.icon?.trim();
		const phaseLabel = currentPhaseDefinition?.label ?? phase.currentPhaseId;
		const phases = sessionState.phases ?? [];
		return (
			<section ref={ref} className={panelClassName}>
				<header className={headerClassName}>
					<p className={turnClassName}>
						<span>Turn {sessionState.game.turn}</span>
						<span className="sr-only">Active player:</span>
						<span className={playerBadgeClassName}>{activePlayerName}</span>
					</p>
					<span
						className={phaseBadgeRightClassName}
						role="status"
						aria-live="polite"
					>
						<span className="text-[0.65rem] text-slate-500 dark:text-slate-300">
							Current Phase
						</span>
						<span className="flex items-center gap-2">
							{phaseIcon ? (
								<span aria-hidden="true" className="text-base leading-none">
									{phaseIcon}
								</span>
							) : null}
							<span>{phaseLabel}</span>
						</span>
					</span>
				</header>
				<div className={panelBodyClassName}>
					<ol className={phaseListClassName}>
						{phases.map((phaseDefinition) => {
							const icon = phaseDefinition.icon?.trim();
							const label = phaseDefinition.label ?? phaseDefinition.id;
							const isActive = phaseDefinition.id === phase.currentPhaseId;
							const listItemClassName = [
								phaseItemBaseClassName,
								isActive
									? phaseItemActiveClassName
									: phaseItemInactiveClassName,
							]
								.filter(Boolean)
								.join(' ');
							const statusClassName = [
								phaseStatusClassName,
								isActive ? phaseStatusActiveClassName : null,
							]
								.filter(Boolean)
								.join(' ');
							return (
								<li
									key={phaseDefinition.id}
									className={listItemClassName}
									aria-current={isActive ? 'step' : undefined}
								>
									<span className={phaseItemContentClassName}>
										{icon ? (
											<span aria-hidden="true" className={phaseIconClassName}>
												{icon}
											</span>
										) : null}
										<span>{label}</span>
									</span>
									<span className={statusClassName}>
										{isActive ? 'Active' : 'Pending'}
									</span>
								</li>
							);
						})}
					</ol>
					<div className="flex justify-end">
						{shouldHideNextTurn ? null : (
							<Button
								variant="primary"
								disabled={!canEndTurn}
								onClick={handleEndTurnClick}
								icon="⏭️"
							>
								Next Turn
							</Button>
						)}
					</div>
				</div>
			</section>
		);
	},
);

PhasePanel.displayName = 'PhasePanel';

export default PhasePanel;
