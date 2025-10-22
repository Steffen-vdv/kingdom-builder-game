import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { toPerformableAction, type Action, type DisplayPlayer } from './types';
import { sumNonActionCosts } from './utils';
import type { ResourceDescriptorSelector } from './utils';
import {
	GenericActionEntry,
	type ActionSortMetrics,
	type PendingActionState,
} from './GenericActionEntry';

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
