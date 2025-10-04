import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	getActionCosts,
	getActionEffectGroups,
	type ActionEffectGroup,
	type ActionEffectGroupChoiceMap,
	type ActionEffectGroupOption,
} from '@kingdom-builder/engine';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import GenericActionCard from './GenericActionCard';
import type { Action, DisplayPlayer } from './ActionsPanel';

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
}: {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const {
		ctx: context,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const formatRequirement = (requirement: string) => requirement;
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
			if (placeholders.has('landId')) {
				const landCount = context.activePlayer.lands.length + 1;
				params.landId = `${context.activePlayer.id}-L${landCount}`;
			}
			if (placeholders.has('playerId')) {
				params.playerId = context.activePlayer.id;
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
		[
			clearHoverCard,
			context.activePlayer.id,
			context.activePlayer.lands.length,
		],
	);

	const handleOptionSelect = useCallback(
		(group: ActionEffectGroup, option: ActionEffectGroupOption) => {
			setPending((previous) => {
				if (!previous) {
					return previous;
				}
				const currentGroup = previous.groups[previous.step];
				if (!currentGroup || currentGroup.id !== group.id) {
					return previous;
				}
				const nextChoices: ActionEffectGroupChoiceMap = {
					...previous.choices,
					[group.id]: { optionId: option.id },
				};
				if (previous.step + 1 < previous.groups.length) {
					return {
						...previous,
						step: previous.step + 1,
						choices: nextChoices,
					};
				}
				void handlePerform(previous.action, {
					...previous.params,
					choices: nextChoices,
				});
				return null;
			});
		},
		[handlePerform],
	);

	const entries = useMemo(() => {
		return actions
			.map((action) => {
				const costBag = getActionCosts(action.id, context);
				const costs: Record<string, number> = {};
				for (const [resourceKey, cost] of Object.entries(costBag)) {
					costs[resourceKey] = cost ?? 0;
				}
				const total = Object.entries(costs).reduce(
					(sum, [resourceKey, cost]) => {
						if (resourceKey === actionCostResource) {
							return sum;
						}
						return sum + (cost ?? 0);
					},
					0,
				);
				const groups = getActionEffectGroups(action.id, context);
				return { action, costs, total, groups };
			})
			.sort((first, second) => first.total - second.total);
	}, [actions, context, actionCostResource]);

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
					context={context}
					actionCostResource={actionCostResource}
					handlePerform={handlePerform}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					formatRequirement={formatRequirement}
				/>
			))}
		</>
	);
}

export default GenericActions;
