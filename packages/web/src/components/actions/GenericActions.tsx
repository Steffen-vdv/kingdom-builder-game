import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import GenericActionCard from './GenericActionCard';
import {
	toPerformableAction,
	type Action,
	type DisplayPlayer,
	type SessionApi,
} from './types';
import type { ResourceDescriptorSelector } from './utils';

export interface PendingActionState {
	action: Action;
	groups: ActionEffectGroup[];
	step: number;
	params: Record<string, unknown>;
	choices: ActionEffectGroupChoiceMap;
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
	const game = useGameEngine();
	const sessionApi: SessionApi = game.session;
	const {
		sessionView,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = game;
	const formatRequirement = (requirement: string) => requirement;
	const performAction = useCallback(
		(action: Action, params?: Record<string, unknown>) =>
			handlePerform(toPerformableAction(action), params),
		[handlePerform],
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
		[handlePerform],
	);

	const entries = useMemo<
		Array<{
			action: Action;
			costs: Record<string, number>;
			total: number;
			groups: ActionEffectGroup[];
		}>
	>(() => {
		return actions
			.map((action) => {
				const costBag = sessionApi.getActionCosts(action.id);
				const costs: Record<string, number> = {};
				for (const [resourceKey, cost] of Object.entries(costBag)) {
					costs[resourceKey] = cost ?? 0;
				}
				const total = Object.entries(costs).reduce<number>(
					(sum, [resourceKey, cost]) => {
						if (resourceKey === actionCostResource) {
							return sum;
						}
						return sum + (cost ?? 0);
					},
					0,
				);
				const groups = sessionApi.getActionOptions(action.id);
				return { action, costs, total, groups };
			})
			.sort((first, second) => first.total - second.total);
	}, [actions, sessionApi, actionCostResource]);

	return (
		<>
			{entries.map(({ action, costs, groups }) => (
				<GenericActionCard
					key={action.id}
					action={action}
					costs={costs}
					groups={groups}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
					pending={pending}
					setPending={setPending}
					cancelPending={cancelPending}
					beginSelection={beginSelection}
					handleOptionSelect={handleOptionSelect}
					session={sessionApi}
					translationContext={translationContext}
					actionCostResource={actionCostResource}
					handlePerform={performAction}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					formatRequirement={formatRequirement}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			))}
		</>
	);
}

export default GenericActions;
