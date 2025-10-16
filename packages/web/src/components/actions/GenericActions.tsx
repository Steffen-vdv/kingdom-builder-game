import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import type { LegacyGameEngineContextValue } from '../../state/GameContext.types';
import { useActionMetadata } from '../../state/useActionMetadata';
import GenericActionCard from './GenericActionCard';
import { toPerformableAction, type Action, type DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';

export interface PendingActionState {
	action: Action;
	groups: ActionEffectGroup[];
	step: number;
	params: Record<string, unknown>;
	choices: ActionEffectGroupChoiceMap;
}

interface GenericActionEntryProps {
	action: Action;
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	pending: PendingActionState | null;
	setPending: React.Dispatch<React.SetStateAction<PendingActionState | null>>;
	cancelPending: () => void;
	beginSelection: (action: Action, groups: ActionEffectGroup[]) => void;
	handleOptionSelect: (
		group: ActionEffectGroup,
		option: ActionEffectGroupOption,
		selectionParams?: Record<string, unknown>,
	) => void;
	session: LegacyGameEngineContextValue['session'];
	translationContext: LegacyGameEngineContextValue['translationContext'];
	actionCostResource: string;
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	handleHoverCard: LegacyGameEngineContextValue['handleHoverCard'];
	clearHoverCard: LegacyGameEngineContextValue['clearHoverCard'];
	formatRequirement: (requirement: string) => string;
	selectResourceDescriptor: ResourceDescriptorSelector;
	onTotalChange: (actionId: string, total: number) => void;
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
	session,
	translationContext,
	actionCostResource,
	handlePerform,
	handleHoverCard,
	clearHoverCard,
	formatRequirement,
	selectResourceDescriptor,
	onTotalChange,
}: GenericActionEntryProps) {
	const { costs, options, hasCosts } = useActionMetadata(action.id);
	const normalizedCosts = useMemo(() => {
		const entries = Object.entries(costs);
		const record: Record<string, number> = {};
		for (const [resourceKey, amount] of entries) {
			record[resourceKey] = amount ?? 0;
		}
		return record;
	}, [costs]);
	const total = useMemo(() => {
		return Object.entries(normalizedCosts).reduce((sum, [key, value]) => {
			if (key === actionCostResource) {
				return sum;
			}
			return sum + (value ?? 0);
		}, 0);
	}, [normalizedCosts, actionCostResource]);
	const sortValue = hasCosts() ? total : Number.POSITIVE_INFINITY;
	useEffect(() => {
		onTotalChange(action.id, sortValue);
	}, [action.id, sortValue, onTotalChange]);
	return (
		<GenericActionCard
			key={action.id}
			action={action}
			costs={normalizedCosts}
			groups={options}
			summaries={summaries}
			player={player}
			canInteract={canInteract}
			pending={pending}
			setPending={setPending}
			cancelPending={cancelPending}
			beginSelection={beginSelection}
			handleOptionSelect={handleOptionSelect}
			session={session}
			translationContext={translationContext}
			actionCostResource={actionCostResource}
			handlePerform={handlePerform}
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
		session,
		sessionView,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const formatRequirement = (requirement: string) => requirement;
	const performAction = useCallback(
		(action: Action, params?: Record<string, unknown>) =>
			handlePerform(toPerformableAction(action), params),
		[handlePerform],
	);
	const [pending, setPending] = useState<PendingActionState | null>(null);
	const [totals, setTotals] = useState<Map<string, number>>(new Map());

	const updateTotal = useCallback((actionId: string, total: number) => {
		setTotals((previous) => {
			const current = previous.get(actionId);
			if (current === total) {
				return previous;
			}
			const next = new Map(previous);
			next.set(actionId, total);
			return next;
		});
	}, []);

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

	const sortedActions = useMemo(() => {
		return [...actions].sort((first, second) => {
			const firstTotal = totals.get(first.id);
			const secondTotal = totals.get(second.id);
			if (firstTotal !== undefined && secondTotal !== undefined) {
				if (firstTotal !== secondTotal) {
					return firstTotal - secondTotal;
				}
			} else if (firstTotal !== undefined) {
				return -1;
			} else if (secondTotal !== undefined) {
				return 1;
			}
			return first.name.localeCompare(second.name);
		});
	}, [actions, totals]);

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
					session={session}
					translationContext={translationContext}
					actionCostResource={actionCostResource}
					handlePerform={performAction}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					formatRequirement={formatRequirement}
					selectResourceDescriptor={selectResourceDescriptor}
					onTotalChange={updateTotal}
				/>
			))}
		</>
	);
}

export default GenericActions;
