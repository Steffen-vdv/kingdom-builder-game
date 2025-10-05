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
import {
	COST_LABEL_CLASSES,
	HEADER_CLASSES,
	INDICATOR_PILL_CLASSES,
	OVERLAY_CLASSES,
	SECTION_CLASSES,
	TITLE_CLASSES,
	TOGGLE_BUTTON_CLASSES,
} from './actionsPanelStyles';
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
	return (
		<section
			className={SECTION_CLASSES}
			aria-disabled={panelDisabled || undefined}
		>
			{panelDisabled && <div aria-hidden className={OVERLAY_CLASSES} />}
			<div className={HEADER_CLASSES}>
				<h2 className={TITLE_CLASSES}>
					{viewingOpponent ? `${opponent.name} Actions` : 'Actions'}{' '}
					<span className={COST_LABEL_CLASSES}>
						(1 {RESOURCES[actionCostResource].icon} each)
					</span>
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{viewingOpponent && (
						<span className={INDICATOR_PILL_CLASSES}>
							<span>Viewing Opponent</span>
						</span>
					)}
					{!isActionPhase && (
						<span className={INDICATOR_PILL_CLASSES}>
							<span>Not In Main Phase</span>
						</span>
					)}
					{isLocalTurn && (
						<button
							type="button"
							className={TOGGLE_BUTTON_CLASSES}
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
