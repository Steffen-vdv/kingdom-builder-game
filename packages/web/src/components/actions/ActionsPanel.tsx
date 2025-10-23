import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { hasAiController } from '../../state/sessionAi';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import type { TranslationActionCategoryDefinition } from '../../translation/context/types';
import BasicOptions from './BasicOptions';
import ActionCategoryHeader, {
	type ActionCategoryDescriptor,
} from './ActionCategoryHeader';
import {
	COST_LABEL_CLASSES,
	HEADER_CLASSES,
	INDICATOR_PILL_CLASSES,
	OVERLAY_CLASSES,
	SECTION_CLASSES,
	TITLE_CLASSES,
	TOGGLE_BUTTON_CLASSES,
	TAB_LIST_CLASSES,
	TAB_BUTTON_CLASSES,
	TAB_BUTTON_ACTIVE_CLASSES,
	TAB_BUTTON_INACTIVE_CLASSES,
} from './actionsPanelStyles';
import type { Action, DisplayPlayer } from './types';
import { normalizeActionFocus } from './types';
import { useActionMetadata } from '../../state/useActionMetadata';
import {
	getActionAvailability,
	type ActionAvailabilityResult,
} from './getActionAvailability';
import { summarizeActionWithInstallation } from './actionSummaryHelpers';

interface CategoryEntry {
	id: string;
	definition?: TranslationActionCategoryDefinition;
	actions: Action[];
}

interface VisibleCategoryEntry extends CategoryEntry {
	descriptor: ActionCategoryDescriptor;
	visibleActions: Action[];
}

interface ActionAvailabilityObserverProps {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
	summary: Summary | undefined;
	onChange: (actionId: string, availability: ActionAvailabilityResult) => void;
}

function ActionAvailabilityObserver({
	action,
	player,
	canInteract,
	summary,
	onChange,
}: ActionAvailabilityObserverProps) {
	const playerId = player.id;
	const metadata = useActionMetadata({
		actionId: action.id,
		playerId,
	});
	const availability = useMemo(
		() =>
			getActionAvailability({
				metadata,
				player,
				canInteract,
				summary,
			}),
		[metadata, player, canInteract, summary],
	);
	useEffect(() => {
		onChange(action.id, availability);
	}, [action.id, availability, onChange]);
	return null;
}

function createCategoryDescriptor(
	definition: TranslationActionCategoryDefinition | undefined,
	fallbackLabel: string,
): ActionCategoryDescriptor {
	const label = definition?.title ?? fallbackLabel;
	const subtitle = definition?.subtitle ?? fallbackLabel;
	const icon = definition?.icon;
	return { icon, label, subtitle };
}

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
	const globalCostDisplay =
		translationContext.assets.resourceV2.selectGlobalActionCost();
	const actionCostDescriptor = useMemo(
		() => selectResourceDescriptor(actionCostResource),
		[selectResourceDescriptor, actionCostResource],
	);
	const fallbackLabel =
		actionCostDescriptor.label ?? actionCostResource ?? 'Action Cost';
	const actionCostLabel = globalCostDisplay?.label ?? fallbackLabel;
	const actionCostIcon = globalCostDisplay?.icon ?? actionCostDescriptor.icon;
	const actionCostAmount = globalCostDisplay?.amount ?? 1;
	const actionCostDescription =
		globalCostDisplay?.description ?? actionCostDescriptor.description;
	const actionCostHeaderText = [
		String(actionCostAmount),
		...(actionCostIcon ? [actionCostIcon] : []),
		...(actionCostLabel ? [actionCostLabel] : []),
	].join(' ');
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
	const actionSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		actions.forEach((actionDefinition) => {
			map.set(
				actionDefinition.id,
				summarizeActionWithInstallation(
					actionDefinition.id,
					translationContext,
				),
			);
		});
		return map;
	}, [actions, translationContext]);
	const categoryDefinitions = useMemo(
		() => translationContext.actionCategories.list(),
		[translationContext.actionCategories],
	);
	const categoriesById = useMemo(
		() =>
			new Map(
				categoryDefinitions.map(
					(definition) => [definition.id, definition] as const,
				),
			),
		[categoryDefinitions],
	);
	const fallbackCategoryId = categoryDefinitions[0]?.id;
	const actionsByCategory = useMemo(() => {
		const map = new Map<string, Action[]>();
		actions.forEach((actionDefinition) => {
			const categoryId = actionDefinition.category ?? fallbackCategoryId;
			if (!categoryId) {
				return;
			}
			if (
				actionDefinition.category !== undefined &&
				!categoriesById.has(actionDefinition.category)
			) {
				return;
			}
			const bucket = map.get(categoryId);
			if (bucket) {
				bucket.push(actionDefinition);
			} else {
				map.set(categoryId, [actionDefinition]);
			}
		});
		return map;
	}, [actions, fallbackCategoryId, categoriesById]);
	const categoryEntries = useMemo<CategoryEntry[]>(() => {
		const entries: CategoryEntry[] = [];
		const seen = new Set<string>();
		categoryDefinitions.forEach((definition) => {
			const grouped = actionsByCategory.get(definition.id) ?? [];
			if (definition.hideWhenEmpty && grouped.length === 0) {
				seen.add(definition.id);
				return;
			}
			entries.push({
				id: definition.id,
				definition,
				actions: grouped,
			});
			seen.add(definition.id);
		});
		actionsByCategory.forEach((grouped, categoryId) => {
			if (seen.has(categoryId)) {
				return;
			}
			if (grouped.length === 0) {
				return;
			}
			entries.push({
				id: categoryId,
				actions: grouped,
			});
		});
		return entries;
	}, [actionsByCategory, categoryDefinitions]);
	const [availabilityMap, setAvailabilityMap] = useState<
		Map<string, ActionAvailabilityResult>
	>(() => new Map());
	useEffect(() => {
		const validIds = new Set(actions.map((entry) => entry.id));
		setAvailabilityMap((previous) => {
			let removed = false;
			previous.forEach((_value, key) => {
				if (!validIds.has(key)) {
					removed = true;
				}
			});
			if (!removed) {
				return previous;
			}
			const next = new Map<string, ActionAvailabilityResult>();
			previous.forEach((value, key) => {
				if (validIds.has(key)) {
					next.set(key, value);
				}
			});
			return next;
		});
	}, [actions]);
	const handleAvailabilityChange = useCallback(
		(actionId: string, availability: ActionAvailabilityResult) => {
			setAvailabilityMap((previous) => {
				const next = new Map(previous);
				next.set(actionId, availability);
				return next;
			});
		},
		[],
	);
	const visibleCategoryEntries = useMemo<VisibleCategoryEntry[]>(() => {
		const entries: VisibleCategoryEntry[] = [];
		categoryEntries.forEach((entry) => {
			const { definition, actions: grouped } = entry;
			const visibleActions = grouped.filter(
				(actionDefinition) => !actionDefinition.system,
			);
			if (definition?.hideWhenEmpty && visibleActions.length === 0) {
				return;
			}
			const fallbackLabel = grouped[0]?.name ?? definition?.title ?? 'Actions';
			const descriptor = createCategoryDescriptor(definition, fallbackLabel);
			entries.push({
				...entry,
				descriptor,
				visibleActions,
			});
		});
		return entries;
	}, [categoryEntries]);
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
	useEffect(() => {
		if (visibleCategoryEntries.length === 0) {
			if (activeCategoryId !== null) {
				setActiveCategoryId(null);
			}
			return;
		}
		if (
			activeCategoryId &&
			visibleCategoryEntries.some((entry) => entry.id === activeCategoryId)
		) {
			return;
		}
		const nextId = visibleCategoryEntries[0]?.id ?? null;
		if (nextId !== activeCategoryId) {
			setActiveCategoryId(nextId);
		}
	}, [visibleCategoryEntries, activeCategoryId]);
	const categoryCounts = useMemo(() => {
		const map = new Map<string, { performable: number; total: number }>();
		visibleCategoryEntries.forEach((entry) => {
			const total = entry.visibleActions.length;
			const performable = entry.visibleActions.reduce(
				(count, actionDefinition) => {
					const availability = availabilityMap.get(actionDefinition.id);
					if (availability?.performable) {
						return count + 1;
					}
					return count;
				},
				0,
			);
			map.set(entry.id, { performable, total });
		});
		return map;
	}, [visibleCategoryEntries, availabilityMap]);
	const activeEntry = activeCategoryId
		? visibleCategoryEntries.find((entry) => entry.id === activeCategoryId)
		: visibleCategoryEntries[0];
	const tabPanelId = 'actions-panel-tabpanel';
	const activeButtonId = activeEntry
		? `actions-panel-tab-${activeEntry.id}`
		: undefined;
	const activeContent = activeEntry ? (
		<BasicOptions
			actions={activeEntry.actions}
			summaries={actionSummaries}
			player={selectedPlayer}
			canInteract={canInteract}
			selectResourceDescriptor={selectResourceDescriptor}
			category={activeEntry.descriptor}
		/>
	) : null;
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
					<span className={COST_LABEL_CLASSES} title={actionCostDescription}>
						({actionCostHeaderText} each)
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
							onClick={() => setViewingOpponent((previous) => !previous)}
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
				<div
					className={TAB_LIST_CLASSES}
					role="tablist"
					aria-label="Action categories"
				>
					{visibleCategoryEntries.map((entry) => {
						const isActive = activeEntry?.id === entry.id;
						const buttonId = `actions-panel-tab-${entry.id}`;
						const counts = categoryCounts.get(entry.id) ?? {
							performable: 0,
							total: entry.visibleActions.length,
						};
						const buttonClasses = [
							TAB_BUTTON_CLASSES,
							isActive
								? TAB_BUTTON_ACTIVE_CLASSES
								: TAB_BUTTON_INACTIVE_CLASSES,
						].join(' ');
						return (
							<button
								key={entry.id}
								id={buttonId}
								type="button"
								role="tab"
								aria-selected={isActive}
								aria-controls={tabPanelId}
								className={buttonClasses}
								onClick={() => setActiveCategoryId(entry.id)}
							>
								<ActionCategoryHeader
									descriptor={entry.descriptor}
									counts={counts}
								/>
							</button>
						);
					})}
				</div>
				<div
					ref={sectionRef}
					role="tabpanel"
					id={tabPanelId}
					aria-labelledby={activeButtonId}
					className="mt-4"
				>
					{activeContent}
				</div>
			</div>
			{actions.map((actionDefinition) => (
				<ActionAvailabilityObserver
					key={`availability-${actionDefinition.id}`}
					action={actionDefinition}
					player={selectedPlayer}
					canInteract={canInteract}
					summary={actionSummaries.get(actionDefinition.id)}
					onChange={handleAvailabilityChange}
				/>
			))}
		</section>
	);
}
