import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionCategoryConfig } from '@kingdom-builder/protocol';
import {
	describeContent,
	summarizeContent,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { hasAiController } from '../../state/sessionAi';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import {
	useRegistryMetadata,
	useResourceMetadata,
} from '../../contexts/RegistryMetadataContext';
import BasicOptions from './BasicOptions';
import BuildOptions from './BuildOptions';
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
import { normalizeActionFocus } from './types';

export default function ActionsPanel() {
	const {
		sessionSnapshot,
		selectors,
		translationContext,
		phase,
		actionCostResource,
		resolution,
		sessionId,
	} = useGameEngine();
	const { sessionView } = selectors;
	const resourceMetadata = useResourceMetadata();
	const selectResourceDescriptor = useCallback(
		(resourceKey: string) =>
			resourceMetadata.byId[resourceKey] ??
			resourceMetadata.select(resourceKey),
		[resourceMetadata],
	);
	const actionCostDescriptor = useMemo(
		() => selectResourceDescriptor(actionCostResource),
		[selectResourceDescriptor, actionCostResource],
	);
	const actionCostIcon = actionCostDescriptor.icon;
	const actionCostLabel = actionCostDescriptor.label ?? actionCostResource;
	const sectionRef = useAnimate<HTMLDivElement>();
	const player = sessionView.active;
	if (!player) {
		return null;
	}
	const opponentView = sessionView.opponent;
	const hasOpponent = Boolean(opponentView);
	const opponent = opponentView ?? player;
	const controlledPlayer = useMemo<DisplayPlayer>(() => {
		const players = sessionSnapshot.game.players;
		const candidateSnapshot =
			players.find((entry) => !hasAiController(sessionId, entry.id)) ??
			players.find(
				(entry) => entry.id === sessionSnapshot.game.activePlayerId,
			) ??
			players.find((entry) => entry.id === sessionSnapshot.game.opponentId) ??
			players[0];
		if (!candidateSnapshot) {
			return player;
		}
		return sessionView.byId.get(candidateSnapshot.id) ?? player;
	}, [
		player,
		sessionId,
		sessionSnapshot.game.activePlayerId,
		sessionSnapshot.game.opponentId,
		sessionSnapshot.game.players,
		sessionView.byId,
	]);
	const [viewingOpponent, setViewingOpponent] = useState(false);
	const toggleOpponentView = useCallback(() => {
		setViewingOpponent((previous) => !previous);
	}, [setViewingOpponent]);

	const actionPhaseId = useMemo(
		() =>
			sessionSnapshot.phases.find((phaseDefinition) => phaseDefinition.action)
				?.id,
		[sessionSnapshot.phases],
	);
	const isActionPhase = isActionPhaseActive(phase, actionPhaseId);
	const activePlayerId = sessionSnapshot.game.activePlayerId;
	const isControlledTurn = !hasAiController(sessionId, activePlayerId);

	useEffect(() => {
		if (!isControlledTurn && viewingOpponent) {
			setViewingOpponent(false);
		}
	}, [isControlledTurn, viewingOpponent]);

	useEffect(() => {
		if (!hasOpponent && viewingOpponent) {
			setViewingOpponent(false);
		}
	}, [hasOpponent, viewingOpponent]);

	const selectedPlayer: DisplayPlayer = viewingOpponent
		? opponent
		: controlledPlayer;
	const canInteract =
		isControlledTurn &&
		isActionPhase &&
		!viewingOpponent &&
		!resolution?.requireAcknowledgement;
	const panelDisabled = !canInteract;

	const actions = useMemo<Action[]>(() => {
		const playerActions =
			sessionView.actionsByPlayer.get(selectedPlayer.id) ?? [];
		const list =
			playerActions.length > 0
				? playerActions
				: sessionView.actionList.filter((actionDefinition) =>
						selectedPlayer.actions.has(actionDefinition.id),
					);
		return list
			.filter(
				(actionDefinition) =>
					!actionDefinition.system ||
					selectedPlayer.actions.has(actionDefinition.id),
			)
			.map((actionDefinition) => {
				const { focus, ...rest } = actionDefinition;
				const normalized = normalizeActionFocus(focus);
				return normalized
					? ({ ...rest, focus: normalized } as Action)
					: (rest as Action);
			});
	}, [sessionView.actionList, sessionView.actionsByPlayer, selectedPlayer]);
	const developmentOptions = useMemo<Development[]>(
		() =>
			sessionView.developmentList.map((developmentDefinition) => {
				const { focus, ...rest } = developmentDefinition;
				const normalized = normalizeActionFocus(focus);
				return normalized
					? ({ ...rest, focus: normalized } as Development)
					: (rest as Development);
			}),
		[sessionView.developmentList],
	);
	const buildingOptions = useMemo<Building[]>(
		() =>
			sessionView.buildingList.map((buildingDefinition) => {
				const { focus, ...rest } = buildingDefinition;
				const normalized = normalizeActionFocus(focus);
				return normalized
					? ({ ...rest, focus: normalized } as Building)
					: (rest as Building);
			}),
		[sessionView.buildingList],
	);

	const actionSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		actions.forEach((actionDefinition) =>
			map.set(
				actionDefinition.id,
				summarizeContent('action', actionDefinition.id, translationContext),
			),
		);
		return map;
	}, [actions, translationContext]);

	const developmentSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		developmentOptions.forEach((developmentDefinition) =>
			map.set(
				developmentDefinition.id,
				summarizeContent(
					'development',
					developmentDefinition.id,
					translationContext,
				),
			),
		);
		return map;
	}, [developmentOptions, translationContext]);

	const buildingSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((buildingDefinition) =>
			map.set(
				buildingDefinition.id,
				summarizeContent('building', buildingDefinition.id, translationContext),
			),
		);
		return map;
	}, [buildingOptions, translationContext]);

	const buildingDescriptions = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((buildingDefinition) =>
			map.set(
				buildingDefinition.id,
				describeContent('building', buildingDefinition.id, translationContext),
			),
		);
		return map;
	}, [buildingOptions, translationContext]);

	const hasDevelopLand = selectedPlayer.lands.some(
		(land) => land.slotsFree > 0,
	);

	const sharedCategoryProps = useMemo(
		() => ({
			player: selectedPlayer,
			canInteract,
			selectResourceDescriptor,
		}),
		[selectedPlayer, canInteract, selectResourceDescriptor],
	);

	const { actionCategories } = useRegistryMetadata();

	const actionsByCategory = useMemo(() => {
		const map = new Map<string, Action[]>();
		for (const action of actions) {
			if (!action.category || action.category === 'building_remove') {
				continue;
			}
			const existing = map.get(action.category);
			if (existing) {
				existing.push(action);
			} else {
				map.set(action.category, [action]);
			}
		}
		return map;
	}, [actions]);

	const raisePopAction = actionsByCategory.get('population')?.[0];
	const developAction = actionsByCategory.get('development')?.[0];
	const buildAction = actionsByCategory.get('building')?.[0];

	const raisePopCategoryId = raisePopAction?.category;
	const developCategoryId = developAction?.category;
	const buildCategoryId = buildAction?.category;

	const raisePopCategory = useMemo(
		() =>
			raisePopCategoryId ? actionCategories.get(raisePopCategoryId) : undefined,
		[actionCategories, raisePopCategoryId],
	);
	const developCategory = useMemo(
		() =>
			developCategoryId ? actionCategories.get(developCategoryId) : undefined,
		[actionCategories, developCategoryId],
	);
	const buildCategory = useMemo(
		() => (buildCategoryId ? actionCategories.get(buildCategoryId) : undefined),
		[actionCategories, buildCategoryId],
	);

	const sortedCategoryDefinitions = useMemo(() => {
		const definitions = actionCategories
			.entries()
			.map(([, definition]) => definition);
		return [...definitions].sort((first, second) => {
			const firstOrder = first.order ?? 0;
			const secondOrder = second.order ?? 0;
			if (firstOrder !== secondOrder) {
				return firstOrder - secondOrder;
			}
			return first.name.localeCompare(second.name);
		});
	}, [actionCategories]);

	const specialCategoryIds = useMemo(
		() =>
			new Set(
				[raisePopCategoryId, developCategoryId, buildCategoryId].filter(
					Boolean,
				) as string[],
			),
		[raisePopCategoryId, developCategoryId, buildCategoryId],
	);

	const genericCategories = useMemo(() => {
		const seen = new Set<string>();
		const mapped = sortedCategoryDefinitions
			.filter((definition) => {
				return !specialCategoryIds.has(definition.id);
			})
			.map((definition) => {
				seen.add(definition.id);
				const actionsForDefinition = actionsByCategory.get(definition.id) ?? [];
				return {
					definition,
					actions: actionsForDefinition,
				};
			})
			.filter((entry) => entry.actions.length > 0);
		for (const entry of actionsByCategory.entries()) {
			const [categoryId, categoryActions] = entry;
			if (categoryActions.length === 0) {
				continue;
			}
			if (specialCategoryIds.has(categoryId) || seen.has(categoryId)) {
				continue;
			}
			const fallbackDefinition: ActionCategoryConfig = {
				id: categoryId,
				name: categoryActions[0]?.name ?? categoryId,
				icon: categoryActions[0]?.icon,
			};
			mapped.push({
				definition: fallbackDefinition,
				actions: categoryActions,
			});
			seen.add(categoryId);
		}
		return mapped;
	}, [sortedCategoryDefinitions, specialCategoryIds, actionsByCategory]);

	const actionsHeading = viewingOpponent
		? `${opponent.name} Actions`
		: 'Actions';
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
					{actionsHeading}{' '}
					<span className={COST_LABEL_CLASSES}>
						(1 {actionCostIcon ?? ''}
						{actionCostIcon ? ' ' : ''}
						{actionCostLabel} each)
					</span>
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{viewingOpponent && (
						<span className={INDICATOR_PILL_CLASSES}>
							<span>Viewing Opponent</span>
						</span>
					)}
					{!isControlledTurn && (
						<span className={INDICATOR_PILL_CLASSES}>
							<span>Opponent Turn</span>
						</span>
					)}
					{!isActionPhase && (
						<span className={INDICATOR_PILL_CLASSES}>
							<span>Not In Main Phase</span>
						</span>
					)}
					{isControlledTurn && hasOpponent && (
						<button
							type="button"
							className={TOGGLE_BUTTON_CLASSES}
							onClick={toggleOpponentView}
							aria-label={toggleLabel}
						>
							<span className="margin-top-correction-five">
								{viewingOpponent ? '←' : '→'}
							</span>
						</button>
					)}
				</div>
			</div>
			<div className="relative">
				<div ref={sectionRef} className="space-y-4">
					{genericCategories.map((entry) => (
						<BasicOptions
							key={entry.definition.id}
							category={entry.definition}
							actions={entry.actions}
							summaries={actionSummaries}
							{...sharedCategoryProps}
						/>
					))}
					{raisePopAction && (
						<HireOptions
							action={raisePopAction}
							category={raisePopCategory}
							{...sharedCategoryProps}
						/>
					)}
					{developAction && (
						<DevelopOptions
							action={developAction}
							category={developCategory}
							isActionPhase={isActionPhase}
							developments={developmentOptions}
							summaries={developmentSummaries}
							hasDevelopLand={hasDevelopLand}
							{...sharedCategoryProps}
						/>
					)}
					{buildAction && (
						<BuildOptions
							action={buildAction}
							category={buildCategory}
							isActionPhase={isActionPhase}
							buildings={buildingOptions}
							summaries={buildingSummaries}
							descriptions={buildingDescriptions}
							{...sharedCategoryProps}
						/>
					)}
				</div>
			</div>
		</section>
	);
}
