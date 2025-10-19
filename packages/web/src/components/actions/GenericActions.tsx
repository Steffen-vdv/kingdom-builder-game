import React, {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { type Summary, type TranslationContext } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useActionMetadata } from '../../state/useActionMetadata';
import GenericActionCard from './GenericActionCard';
import {
	toPerformableAction,
	type Action,
	type DisplayPlayer,
	type HoverCardData,
} from './types';
import { splitActionCostMap, sumNonActionCosts, sumUpkeep } from './utils';
import type { ResourceDescriptorSelector } from './utils';

export interface PendingActionState {
	action: Action;
	groups: ActionEffectGroup[];
	step: number;
	params: Record<string, unknown>;
	choices: ActionEffectGroupChoiceMap;
}

interface ActionSortMetrics {
	cost: number | null;
	cleanup: number | null;
}

interface GenericActionEntryProps {
	action: Action;
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	pending: PendingActionState | null;
	setPending: Dispatch<SetStateAction<PendingActionState | null>>;
	cancelPending: () => void;
	beginSelection: (action: Action, groups: ActionEffectGroup[]) => void;
	handleOptionSelect: (
		group: ActionEffectGroup,
		option: ActionEffectGroupOption,
		params?: Record<string, unknown>,
	) => void;
	translationContext: TranslationContext;
	actionCostResource: string;
	performAction: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	handleHoverCard: (data: HoverCardData) => void;
	clearHoverCard: () => void;
	formatRequirement: (requirement: string) => string;
	selectResourceDescriptor: ResourceDescriptorSelector;
	onSortMetricsChange: (actionId: string, metrics: ActionSortMetrics) => void;
}

function GenericActionEntry({
	action,
	summaries,
	player,
	canInteract,
	pending,
	setPending,
	cancelPending,
	beginSelection,
	handleOptionSelect,
	translationContext,
	actionCostResource,
	performAction,
	handleHoverCard,
	clearHoverCard,
	formatRequirement,
	selectResourceDescriptor,
	onSortMetricsChange,
}: GenericActionEntryProps) {
	const metadata = useActionMetadata({ actionId: action.id });
	const { costs: actionCosts, cleanup: cleanupCosts } = useMemo(
		() => splitActionCostMap(metadata.costs),
		[metadata.costs],
	);
	const total = useMemo(() => {
		if (!metadata.costs) {
			return null;
		}
		return sumNonActionCosts(actionCosts, actionCostResource);
	}, [metadata.costs, actionCosts, actionCostResource]);
	const cleanupTotal = useMemo(() => {
		if (!metadata.costs) {
			return null;
		}
		return sumUpkeep(cleanupCosts);
	}, [metadata.costs, cleanupCosts]);
	useEffect(() => {
		onSortMetricsChange(action.id, {
			cost: total,
			cleanup: cleanupTotal,
		});
	}, [action.id, total, cleanupTotal, onSortMetricsChange]);
	return (
		<GenericActionCard
			action={action}
			metadata={metadata}
			summaries={summaries}
			player={player}
			canInteract={canInteract}
			pending={pending}
			setPending={setPending}
			cancelPending={cancelPending}
			beginSelection={beginSelection}
			handleOptionSelect={handleOptionSelect}
			translationContext={translationContext}
			actionCostResource={actionCostResource}
			performAction={performAction}
			handleHoverCard={handleHoverCard}
			clearHoverCard={clearHoverCard}
			formatRequirement={formatRequirement}
			selectResourceDescriptor={selectResourceDescriptor}
		/>
	);
}

function GenericActions({
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
}: {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}) {
	const {
		selectors,
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { sessionView } = selectors;
	const formatRequirement = (requirement: string) => requirement;
	const performAction = useCallback(
		(action: Action, params?: Record<string, unknown>) => {
			const request = params
				? {
						action: toPerformableAction(action),
						params,
					}
				: { action: toPerformableAction(action) };
			return requests.performAction(request);
		},
		[requests],
	);
	const [pending, setPending] = useState<PendingActionState | null>(null);

	useEffect(() => {
		if (!canInteract) {
			setPending(null);
		}
	}, [canInteract]);

	const cancelPending = useCallback(() => {
		clearHoverCard();
		setPending(null);
	}, [clearHoverCard]);

	const beginSelection = useCallback(
		(targetAction: Action, groups: ActionEffectGroup[]) => {
			if (groups.length === 0) {
				return;
			}
			const placeholders = new Set<string>();
			for (const group of groups) {
				for (const option of group.options) {
					const values = Object.values(option.params || {});
					for (const value of values) {
						if (typeof value === 'string' && value.startsWith('$')) {
							placeholders.add(value.slice(1));
						}
					}
				}
			}
			const params: Record<string, unknown> = {};
			const activePlayer = sessionView.active;
			if (placeholders.has('landId') && activePlayer) {
				const landCount = activePlayer.lands.length + 1;
				params.landId = `${activePlayer.id}-L${landCount}`;
			}
			if (placeholders.has('playerId') && activePlayer) {
				params.playerId = activePlayer.id;
			}
			for (const placeholder of placeholders) {
				if (placeholder in params) {
					continue;
				}
				params[placeholder] = undefined;
			}
			clearHoverCard();
			setPending({
				action: targetAction,
				groups,
				step: 0,
				params,
				choices: {},
			});
		},
		[clearHoverCard, sessionView.active?.id, sessionView.active?.lands.length],
	);

	const handleOptionSelect = useCallback(
		(
			group: ActionEffectGroup,
			option: ActionEffectGroupOption,
			selectionParams?: Record<string, unknown>,
		) => {
			setPending((previous) => {
				if (!previous) {
					return previous;
				}
				const currentGroup = previous.groups[previous.step];
				if (!currentGroup || currentGroup.id !== group.id) {
					return previous;
				}
				let resolvedParams: Record<string, unknown> | undefined;
				if (selectionParams) {
					const entries = Object.entries(selectionParams).filter(
						([, value]) => value !== undefined,
					);
					if (entries.length > 0) {
						resolvedParams = Object.fromEntries(entries) as Record<
							string,
							unknown
						>;
					}
				}
				const choice = resolvedParams
					? { optionId: option.id, params: resolvedParams }
					: { optionId: option.id };
				const nextChoices: ActionEffectGroupChoiceMap = {
					...previous.choices,
					[group.id]: choice,
				};
				const forwardedEntries = resolvedParams
					? Object.entries(resolvedParams).filter(([key]) =>
							Object.prototype.hasOwnProperty.call(previous.params, key),
						)
					: [];
				const mergedParams = forwardedEntries.length
					? {
							...previous.params,
							...Object.fromEntries(forwardedEntries),
						}
					: previous.params;
				if (previous.step + 1 < previous.groups.length) {
					return {
						...previous,
						step: previous.step + 1,
						choices: nextChoices,
						params: mergedParams,
					};
				}
				void performAction(previous.action, {
					...mergedParams,
					choices: nextChoices,
				});
				return null;
			});
		},
		[performAction],
	);

	const [actionSortMetrics, setActionSortMetrics] = useState<
		Record<string, ActionSortMetrics>
	>({});
	const handleSortMetricsChange = useCallback(
		(actionId: string, metrics: ActionSortMetrics) => {
			setActionSortMetrics((previous) => {
				const existing = previous[actionId];
				if (
					existing &&
					existing.cost === metrics.cost &&
					existing.cleanup === metrics.cleanup
				) {
					return previous;
				}
				return { ...previous, [actionId]: metrics };
			});
		},
		[],
	);

	const sortedActions = useMemo(() => {
		return actions
			.map((action, index) => ({
				action,
				index,
				metrics: actionSortMetrics[action.id],
				fallbackCost: sumNonActionCosts(action.baseCosts, actionCostResource),
			}))
			.sort((first, second) => {
				const firstCost = first.metrics?.cost ?? first.fallbackCost;
				const secondCost = second.metrics?.cost ?? second.fallbackCost;
				if (firstCost !== secondCost) {
					return firstCost - secondCost;
				}
				const firstCleanup = first.metrics?.cleanup ?? 0;
				const secondCleanup = second.metrics?.cleanup ?? 0;
				if (firstCleanup !== secondCleanup) {
					return firstCleanup - secondCleanup;
				}
				const nameComparison = first.action.name.localeCompare(
					second.action.name,
				);
				if (nameComparison !== 0) {
					return nameComparison;
				}
				return first.index - second.index;
			})
			.map((entry) => entry.action);
	}, [actions, actionSortMetrics, actionCostResource]);

	return (
		<>
			{sortedActions.map((action) => (
				<GenericActionEntry
					key={action.id}
					action={action}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
					pending={pending}
					setPending={setPending}
					cancelPending={cancelPending}
					beginSelection={beginSelection}
					handleOptionSelect={handleOptionSelect}
					translationContext={translationContext}
					actionCostResource={actionCostResource}
					performAction={performAction}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					formatRequirement={formatRequirement}
					selectResourceDescriptor={selectResourceDescriptor}
					onSortMetricsChange={handleSortMetricsChange}
				/>
			))}
		</>
	);
}

export default GenericActions;
