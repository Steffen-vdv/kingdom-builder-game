import React, { useMemo } from 'react';
import { useGameEngine } from '../../state/GameContext';
import Button from '../common/Button';
import { DEFAULT_PLAYER_NAME } from '../../state/playerIdentity';

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

const currentPhaseCardClassName = [
	'flex flex-col gap-1 rounded-2xl border border-indigo-200/70 px-4 py-3',
	'bg-indigo-50/80 text-indigo-700 shadow-sm dark:border-indigo-300/40',
	'dark:bg-indigo-500/20 dark:text-indigo-100',
].join(' ');

const currentPhaseLabelClassName = [
	'text-[0.625rem] uppercase tracking-[0.35em]',
].join(' ');

const currentPhaseNameClassName = [
	'text-sm font-semibold tracking-[0.08em]',
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

const phaseListItemIconClassName = [
	'grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-base',
	'text-indigo-600 shadow-inner dark:bg-white/10 dark:text-indigo-200',
].join(' ');

const phaseListItemLabelClassName = [
	'flex-1 text-xs uppercase tracking-[0.2em]',
].join(' ');

export default function PhasePanel() {
	const { sessionState, selectors, phase, requests, resolution } =
		useGameEngine();
	const { sessionView } = selectors;
	const phases = useMemo(
		() =>
			sessionState.phases.map((phaseDefinition) => ({
				id: phaseDefinition.id,
				label: phaseDefinition.label ?? phaseDefinition.id,
				icon: phaseDefinition.icon?.trim() ?? '',
			})),
		[sessionState.phases],
	);
	const currentPhaseDefinition = useMemo(
		() =>
			phases.find(
				(phaseDefinition) => phaseDefinition.id === phase.currentPhaseId,
			),
		[phases, phase.currentPhaseId],
	);
	const fallbackName =
		sessionState.game.players[0]?.name ?? DEFAULT_PLAYER_NAME;
	const phaseActiveName = phase.activePlayerName.trim();
	const activePlayerName =
		phaseActiveName.length > 0
			? phaseActiveName
			: (sessionView.active?.name ?? fallbackName);
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
							{sessionState.game.turn}
						</span>
					</span>
					<span className="sr-only">Active player:</span>
					<div className={playerDetailsClassName}>
						<span className={playerLabelClassName}>Active Player</span>
						<span className={playerNameClassName}>{activePlayerName}</span>
					</div>
				</div>
				<div
					className={currentPhaseCardClassName}
					role="status"
					aria-live="polite"
				>
					<span className={currentPhaseLabelClassName}>Current Phase</span>
					<span className={currentPhaseNameClassName}>
						{currentPhaseDefinition?.label ?? phase.currentPhaseId}
					</span>
				</div>
			</header>
			<div className={phaseSectionClassName}>
				<p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
					Phase Order
				</p>
				<ul className={phaseListClassName}>
					{phases.map((phaseDefinition) => {
						const isActive = phaseDefinition.id === phase.currentPhaseId;
						const icon =
							phaseDefinition.icon !== '' ? phaseDefinition.icon : '•';
						return (
							<li
								key={phaseDefinition.id}
								className={phaseListItemClassName}
								data-active={isActive ? 'true' : 'false'}
								aria-current={isActive ? 'step' : undefined}
							>
								<span className={phaseListItemContentClassName}>
									<span
										className={phaseListItemIconClassName}
										aria-hidden="true"
									>
										{icon}
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
