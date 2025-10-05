import React, { useEffect, useMemo, useState } from 'react';
import { RESOURCES } from '@kingdom-builder/contents';
import {
	describeContent,
	summarizeContent,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import BasicOptions from './BasicOptions';
import BuildOptions from './BuildOptions';
import DemolishOptions from './DemolishOptions';
import DevelopOptions from './DevelopOptions';
import HireOptions from './HireOptions';
import type { Action, Building, Development, DisplayPlayer } from './types';

export default function ActionsPanel() {
	const { ctx, tabsEnabled, actionCostResource } = useGameEngine();
	const sectionRef = useAnimate<HTMLDivElement>();
	const player = ctx.game.players[0]!;
	const opponent = ctx.game.players[1]!;
	const [viewingOpponent, setViewingOpponent] = useState(false);

	const actionPhaseId = useMemo(
		() => ctx.phases.find((phaseDefinition) => phaseDefinition.action)?.id,
		[ctx],
	);
	const isActionPhase = isActionPhaseActive(
		ctx.game.currentPhase,
		actionPhaseId,
		tabsEnabled,
	);
	const isLocalTurn = ctx.activePlayer.id === player.id;

	useEffect(() => {
		if (!isLocalTurn && viewingOpponent) {
			setViewingOpponent(false);
		}
	}, [isLocalTurn, viewingOpponent]);

	const selectedPlayer: DisplayPlayer = viewingOpponent ? opponent : player;
	const canInteract = isLocalTurn && isActionPhase && !viewingOpponent;
	const panelDisabled = !canInteract;

	const actions = useMemo<Action[]>(
		() =>
			Array.from(
				(ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
			)
				.filter(
					(actionDefinition) =>
						!actionDefinition.system ||
						selectedPlayer.actions.has(actionDefinition.id),
				)
				.sort(
					(firstAction, secondAction) =>
						(firstAction.order ?? 0) - (secondAction.order ?? 0),
				),
		[ctx, selectedPlayer.actions.size, selectedPlayer.id],
	);
	const developmentOptions = useMemo<Development[]>(
		() =>
			Array.from(
				(
					ctx.developments as unknown as { map: Map<string, Development> }
				).map.values(),
			)
				.filter((developmentDefinition) => !developmentDefinition.system)
				.sort(
					(firstDevelopment, secondDevelopment) =>
						(firstDevelopment.order ?? 0) - (secondDevelopment.order ?? 0),
				),
		[ctx],
	);
	const buildingOptions = useMemo<Building[]>(
		() =>
			Array.from(
				(
					ctx.buildings as unknown as { map: Map<string, Building> }
				).map.values(),
			),
		[ctx],
	);

	const actionSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		actions.forEach((actionDefinition) =>
			map.set(
				actionDefinition.id,
				summarizeContent('action', actionDefinition.id, ctx),
			),
		);
		return map;
	}, [actions, ctx]);

	const developmentSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		developmentOptions.forEach((developmentDefinition) =>
			map.set(
				developmentDefinition.id,
				summarizeContent('development', developmentDefinition.id, ctx),
			),
		);
		return map;
	}, [developmentOptions, ctx]);

	const buildingSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((buildingDefinition) =>
			map.set(
				buildingDefinition.id,
				summarizeContent('building', buildingDefinition.id, ctx),
			),
		);
		return map;
	}, [buildingOptions, ctx]);

	const buildingDescriptions = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((buildingDefinition) =>
			map.set(
				buildingDefinition.id,
				describeContent('building', buildingDefinition.id, ctx),
			),
		);
		return map;
	}, [buildingOptions, ctx]);

	const hasDevelopLand = selectedPlayer.lands.some(
		(land) => land.slotsFree > 0,
	);
	const developAction = actions.find(
		(action) => action.category === 'development',
	);
	const buildAction = actions.find((action) => action.category === 'building');
	const demolishAction = actions.find(
		(action) => action.category === 'building_remove',
	);
	const raisePopAction = actions.find(
		(action) => action.category === 'population',
	);
	const otherActions = actions.filter(
		(action) => (action.category ?? 'basic') === 'basic',
	);

	const toggleLabel = viewingOpponent
		? 'Show player actions'
		: 'Show opponent actions';
	const sectionClasses = [
		'relative',
		'rounded-3xl',
		'border',
		'border-white/60',
		'bg-white/75',
		'p-6',
		'shadow-2xl',
		'backdrop-blur-xl',
		'dark:border-white/10',
		'dark:bg-slate-900/70',
		'dark:shadow-slate-900/50',
		'frosted-surface',
	].join(' ');
	const overlayClasses = [
		'pointer-events-none',
		'absolute',
		'inset-0',
		'rounded-3xl',
		'bg-gradient-to-br',
		'from-white/70',
		'via-white/55',
		'to-white/10',
		'ring-1',
		'ring-inset',
		'ring-white/60',
		'dark:from-slate-100/15',
		'dark:via-slate-100/10',
		'dark:to-transparent',
		'dark:ring-white/10',
	].join(' ');
	const headerClasses = [
		'mb-4',
		'flex',
		'flex-col',
		'gap-3',
		'sm:flex-row',
		'sm:items-center',
		'sm:justify-between',
	].join(' ');
	const titleClasses = [
		'text-2xl',
		'font-semibold',
		'tracking-tight',
		'text-slate-900',
		'dark:text-slate-100',
	].join(' ');
	const costLabelClasses = [
		'text-base',
		'font-normal',
		'text-slate-500',
		'dark:text-slate-300',
	].join(' ');
	const indicatorPillClasses = [
		'rounded-full',
		'border',
		'border-white/60',
		'bg-white/70',
		'px-3',
		'py-1',
		'text-xs',
		'font-semibold',
		'uppercase',
		'tracking-[0.3em]',
		'text-slate-600',
		'shadow-sm',
		'dark:border-white/10',
		'dark:bg-white/10',
		'dark:text-slate-200',
		'frosted-surface',
	].join(' ');
	const toggleButtonClasses = [
		'inline-flex',
		'h-10',
		'w-10',
		'items-center',
		'justify-center',
		'rounded-full',
		'border',
		'border-white/60',
		'bg-white/70',
		'text-lg',
		'font-semibold',
		'text-slate-700',
		'shadow-md',
		'transition',
		'hover:bg-white/90',
		'hover:text-slate-900',
		'focus:outline-none',
		'focus-visible:ring-2',
		'focus-visible:ring-amber-400',
		'dark:border-white/10',
		'dark:bg-slate-900/80',
		'dark:text-slate-100',
		'dark:hover:bg-slate-900',
	].join(' ');

	return (
		<section
			className={sectionClasses}
			aria-disabled={panelDisabled || undefined}
		>
			{panelDisabled && <div aria-hidden className={overlayClasses} />}
			<div className={headerClasses}>
				<h2 className={titleClasses}>
					{viewingOpponent ? `${opponent.name} Actions` : 'Actions'}{' '}
					<span className={costLabelClasses}>
						(1 {RESOURCES[actionCostResource].icon} each)
					</span>
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{viewingOpponent && (
						<span className={indicatorPillClasses}>
							<span>Viewing Opponent</span>
						</span>
					)}
					{!isActionPhase && (
						<span className={indicatorPillClasses}>
							<span>Not In Main Phase</span>
						</span>
					)}
					{isLocalTurn && (
						<button
							type="button"
							className={toggleButtonClasses}
							onClick={() => setViewingOpponent((previous) => !previous)}
							aria-label={toggleLabel}
						>
							{viewingOpponent ? '←' : '→'}
						</button>
					)}
				</div>
			</div>
			<div className="relative">
				<div ref={sectionRef} className="space-y-4">
					{otherActions.length > 0 && (
						<BasicOptions
							actions={otherActions}
							summaries={actionSummaries}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{raisePopAction && (
						<HireOptions
							action={raisePopAction}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{developAction && (
						<DevelopOptions
							action={developAction}
							isActionPhase={isActionPhase}
							developments={developmentOptions}
							summaries={developmentSummaries}
							hasDevelopLand={hasDevelopLand}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{buildAction && (
						<BuildOptions
							action={buildAction}
							isActionPhase={isActionPhase}
							buildings={buildingOptions}
							summaries={buildingSummaries}
							descriptions={buildingDescriptions}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{demolishAction && (
						<DemolishOptions
							action={demolishAction}
							isActionPhase={isActionPhase}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
				</div>
			</div>
		</section>
	);
}
