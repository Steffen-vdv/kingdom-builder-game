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

const phaseListClassName = ['mt-4 grid gap-3', 'sm:grid-cols-3 sm:gap-4'].join(
	' ',
);

const phaseListItemClassName = [
	'flex items-center rounded-2xl border px-4 py-3 text-sm font-semibold',
	'uppercase tracking-[0.15em] text-slate-600 shadow-sm transition',
	'border-white/60 bg-white/70 dark:border-white/10 dark:bg-slate-900/70',
	'dark:text-slate-200',
	'data-[active=true]:border-amber-500 data-[active=true]:bg-amber-100/80',
	'data-[active=true]:text-amber-800 dark:data-[active=true]:border-amber-300/60',
	'dark:data-[active=true]:bg-amber-500/10 dark:data-[active=true]:text-amber-100',
].join(' ');

const phaseListItemContentClassName = [
	'flex w-full items-center justify-between gap-3',
].join(' ');

const phaseListItemIconClassName = 'text-lg leading-none';

export default function PhasePanel() {
	const { sessionState, sessionView, phase, handleEndTurn, resolution } =
		useGameEngine();
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
	const activePlayerName =
		sessionView.active?.name ?? sessionState.game.players[0]?.name ?? 'Player';
	const canEndTurn = phase.canEndTurn && !phase.isAdvancing;
	const shouldHideNextTurn = Boolean(resolution?.requireAcknowledgement);
	const handleEndTurnClick = () => {
		// Phase errors are surfaced via onFatalSessionError inside
		// usePhaseProgress.
		void handleEndTurn();
	};
	const badgeIcon = currentPhaseDefinition?.icon;
	const badgeLabel = currentPhaseDefinition?.label ?? phase.currentPhaseId;
	return (
		<section className={panelClassName}>
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
						{badgeIcon ? (
							<span className="text-base leading-none">{badgeIcon}</span>
						) : null}
						<span>{badgeLabel}</span>
					</span>
				</span>
			</header>
			<ul className={phaseListClassName}>
				{phases.map((phaseDefinition) => {
					const isActive = phaseDefinition.id === phase.currentPhaseId;
					const icon = phaseDefinition.icon !== '' ? phaseDefinition.icon : '•';
					return (
						<li
							key={phaseDefinition.id}
							className={phaseListItemClassName}
							data-active={isActive ? 'true' : 'false'}
							aria-current={isActive ? 'step' : undefined}
						>
							<span className={phaseListItemContentClassName}>
								<span className={phaseListItemIconClassName}>{icon}</span>
								<span>{phaseDefinition.label}</span>
							</span>
						</li>
					);
				})}
			</ul>
			<div className="mt-auto flex justify-end">
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
		</section>
	);
}
