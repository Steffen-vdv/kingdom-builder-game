import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	describeContent,
	summarizeContent,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { hasAiController } from '../../state/sessionAi';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import type { TranslationActionCategoryDefinition } from '../../translation/context/types';
import BasicOptions from './BasicOptions';
import BuildOptions from './BuildOptions';
import DevelopOptions from './DevelopOptions';
import HireOptions from './HireOptions';
import type { ActionCategoryDescriptor } from './ActionCategoryHeader';
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
	TAB_COUNT_BADGE_CLASSES,
	TAB_ICON_CLASSES,
	TAB_LABEL_CLASSES,
	TAB_PANEL_CLASSES,
} from './actionsPanelStyles';
import type { Action, Building, Development, DisplayPlayer } from './types';
import { normalizeActionFocus } from './types';
import type { ResourceDescriptorSelector } from './utils';
import { useActionMetadata } from '../../state/useActionMetadata';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import {
	getActionAvailability,
	EMPTY_ACTION_METADATA,
} from './getActionAvailability';

interface CategoryEntry {
	id: string;
	definition: TranslationActionCategoryDefinition | undefined;
	actions: Action[];
	descriptor: ActionCategoryDescriptor;
}

interface CategoryRendererContext {
	actions: Action[];
	descriptor: ActionCategoryDescriptor;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	actionSummaries: Map<string, Summary>;
	isActionPhase: boolean;
	developmentOptions: Development[];
	developmentSummaries: Map<string, Summary>;
	buildingOptions: Building[];
	buildingSummaries: Map<string, Summary>;
	buildingDescriptions: Map<string, Summary>;
	hasDevelopLand: boolean;
	metadataByAction: Map<string, UseActionMetadataResult>;
}

type CategoryRenderer = (context: CategoryRendererContext) => React.ReactNode;

function ActionMetadataWatcher({
	actionId,
	onMetadataChange,
}: {
	actionId: string;
	onMetadataChange: (
		actionId: string,
		metadata: UseActionMetadataResult,
	) => void;
}) {
	const metadata = useActionMetadata({ actionId });
	useEffect(() => {
		onMetadataChange(actionId, metadata);
	}, [actionId, metadata, onMetadataChange]);
	return null;
}

const renderGenericGrid: CategoryRenderer = ({
	actions,
	descriptor,
	player,
	canInteract,
	selectResourceDescriptor,
	actionSummaries,
	metadataByAction,
}) => {
	if (actions.length === 0) {
		return null;
	}
	return (
		<BasicOptions
			actions={actions}
			summaries={actionSummaries}
			player={player}
			canInteract={canInteract}
			selectResourceDescriptor={selectResourceDescriptor}
			category={descriptor}
			metadataByAction={metadataByAction}
		/>
	);
};

const renderHireCategory: CategoryRenderer = ({
	actions,
	descriptor,
	player,
	canInteract,
	selectResourceDescriptor,
}) => {
	const action = actions[0];
	if (!action) {
		return null;
	}
	return (
		<HireOptions
			action={action}
			player={player}
			canInteract={canInteract}
			selectResourceDescriptor={selectResourceDescriptor}
			category={descriptor}
		/>
	);
};

const renderDevelopCategory: CategoryRenderer = ({
	actions,
	descriptor,
	player,
	canInteract,
	selectResourceDescriptor,
	isActionPhase,
	developmentOptions,
	developmentSummaries,
	hasDevelopLand,
}) => {
	const action = actions[0];
	if (!action) {
		return null;
	}
	return (
		<DevelopOptions
			action={action}
			isActionPhase={isActionPhase}
			developments={developmentOptions}
			summaries={developmentSummaries}
			hasDevelopLand={hasDevelopLand}
			player={player}
			canInteract={canInteract}
			selectResourceDescriptor={selectResourceDescriptor}
			category={descriptor}
		/>
	);
};

const renderBuildCategory: CategoryRenderer = ({
	actions,
	descriptor,
	player,
	canInteract,
	selectResourceDescriptor,
	isActionPhase,
	buildingOptions,
	buildingSummaries,
	buildingDescriptions,
}) => {
	const action = actions[0];
	if (!action) {
		return null;
	}
	return (
		<BuildOptions
			action={action}
			isActionPhase={isActionPhase}
			buildings={buildingOptions}
			summaries={buildingSummaries}
			descriptions={buildingDescriptions}
			player={player}
			canInteract={canInteract}
			selectResourceDescriptor={selectResourceDescriptor}
			category={descriptor}
		/>
	);
};

const CATEGORY_RENDERERS = new Map<string, CategoryRenderer>([
	['basic', renderGenericGrid],
	['hire', renderHireCategory],
	['develop', renderDevelopCategory],
	['build', renderBuildCategory],
]);

const DEFAULT_RENDERER = renderGenericGrid;

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

	const [metadataByAction, setMetadataByAction] = useState<
		Map<string, UseActionMetadataResult>
	>(() => new Map());
	const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

	const handleMetadataUpdate = useCallback(
		(actionId: string, metadata: UseActionMetadataResult) => {
			setMetadataByAction((previous) => {
				const current = previous.get(actionId);
				if (current === metadata) {
					return previous;
				}
				const next = new Map(previous);
				next.set(actionId, metadata);
				return next;
			});
		},
		[],
	);

	useEffect(() => {
		setMetadataByAction((previous) => {
			const next = new Map<string, UseActionMetadataResult>();
			actions.forEach((actionDefinition) => {
				const existing = previous.get(actionDefinition.id);
				if (existing) {
					next.set(actionDefinition.id, existing);
				}
			});
			return next;
		});
	}, [actions]);

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
			if (grouped.length === 0) {
				seen.add(definition.id);
				return;
			}
			const fallbackLabel = grouped[0]?.name ?? definition.title ?? 'Actions';
			entries.push({
				id: definition.id,
				definition,
				actions: grouped,
				descriptor: createCategoryDescriptor(definition, fallbackLabel),
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
			const definition = categoriesById.get(categoryId);
			const fallbackLabel = grouped[0]?.name ?? definition?.title ?? 'Actions';
			entries.push({
				id: categoryId,
				definition,
				actions: grouped,
				descriptor: createCategoryDescriptor(definition, fallbackLabel),
			});
		});
		return entries;
	}, [actionsByCategory, categoryDefinitions, categoriesById]);

	useEffect(() => {
		if (categoryEntries.length === 0) {
			setActiveCategoryId(null);
			return;
		}
		setActiveCategoryId((previous) => {
			if (previous && categoryEntries.some((entry) => entry.id === previous)) {
				return previous;
			}
			return categoryEntries[0]?.id ?? null;
		});
	}, [categoryEntries]);

	const countsByCategory = useMemo(() => {
		const counts = new Map<string, { performable: number; total: number }>();
		categoryEntries.forEach((entry) => {
			let total = 0;
			let performable = 0;
			entry.actions.forEach((actionDefinition) => {
				if (actionDefinition.system) {
					return;
				}
				total += 1;
				const metadata =
					metadataByAction.get(actionDefinition.id) ?? EMPTY_ACTION_METADATA;
				const summary = actionSummaries.get(actionDefinition.id);
				const availability = getActionAvailability({
					metadata,
					summary,
					player: selectedPlayer,
					canInteract,
				});
				if (availability.isPerformable) {
					performable += 1;
				}
			});
			counts.set(entry.id, { performable, total });
		});
		return counts;
	}, [
		categoryEntries,
		metadataByAction,
		actionSummaries,
		selectedPlayer,
		canInteract,
	]);

	const activeCategory = useMemo(
		() => categoryEntries.find((entry) => entry.id === activeCategoryId),
		[categoryEntries, activeCategoryId],
	);

	const activeCategoryContent = useMemo(() => {
		if (!activeCategory) {
			return null;
		}
		const definition = activeCategory.definition;
		if (definition?.hideWhenEmpty && activeCategory.actions.length === 0) {
			return null;
		}
		const analyticsKey =
			definition?.analyticsKey ?? definition?.id ?? activeCategory.id;
		const rendererKey = analyticsKey?.toLowerCase();
		const renderer =
			(rendererKey ? CATEGORY_RENDERERS.get(rendererKey) : undefined) ??
			DEFAULT_RENDERER;
		return renderer({
			actions: activeCategory.actions,
			descriptor: activeCategory.descriptor,
			player: selectedPlayer,
			canInteract,
			selectResourceDescriptor,
			actionSummaries,
			isActionPhase,
			developmentOptions,
			developmentSummaries,
			buildingOptions,
			buildingSummaries,
			buildingDescriptions,
			hasDevelopLand,
			metadataByAction,
		});
	}, [
		activeCategory,
		selectedPlayer,
		canInteract,
		selectResourceDescriptor,
		actionSummaries,
		isActionPhase,
		developmentOptions,
		developmentSummaries,
		buildingOptions,
		buildingSummaries,
		buildingDescriptions,
		hasDevelopLand,
		metadataByAction,
	]);

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
			<div
				className={TAB_LIST_CLASSES}
				role="tablist"
				aria-label="Action categories"
			>
				{categoryEntries.map((entry) => {
					const counts = countsByCategory.get(entry.id) ?? {
						performable: 0,
						total: 0,
					};
					const isActive = entry.id === activeCategoryId;
					const descriptor = entry.descriptor;
					const tabId = `actions-tab-${entry.id}`;
					const panelId = `actions-tabpanel-${entry.id}`;
					return (
						<button
							key={entry.id}
							type="button"
							role="tab"
							id={tabId}
							aria-selected={isActive}
							aria-controls={panelId}
							tabIndex={isActive ? 0 : -1}
							className={`${TAB_BUTTON_CLASSES} ${
								isActive
									? TAB_BUTTON_ACTIVE_CLASSES
									: TAB_BUTTON_INACTIVE_CLASSES
							}`}
							onClick={() => setActiveCategoryId(entry.id)}
						>
							<span className={TAB_LABEL_CLASSES}>
								{descriptor.icon ? (
									<span aria-hidden className={TAB_ICON_CLASSES}>
										{descriptor.icon}
									</span>
								) : null}
								<span>{descriptor.label}</span>
							</span>
							<span className={TAB_COUNT_BADGE_CLASSES}>
								{counts.performable}/{counts.total}
							</span>
						</button>
					);
				})}
			</div>
			<div className={TAB_PANEL_CLASSES}>
				<div
					ref={sectionRef}
					role="tabpanel"
					id={
						activeCategory ? `actions-tabpanel-${activeCategory.id}` : undefined
					}
					aria-labelledby={
						activeCategory ? `actions-tab-${activeCategory.id}` : undefined
					}
				>
					{activeCategoryContent}
				</div>
			</div>
			{actions.map((actionDefinition) => (
				<ActionMetadataWatcher
					key={`metadata-${actionDefinition.id}`}
					actionId={actionDefinition.id}
					onMetadataChange={handleMetadataUpdate}
				/>
			))}
		</section>
	);
}
