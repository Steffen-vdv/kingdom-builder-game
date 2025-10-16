import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import { type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
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
	const [costTotals, setCostTotals] = useState<Map<string, number>>(new Map());

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

	useEffect(() => {
		setCostTotals((previous) => {
			if (previous.size === 0) {
				return previous;
			}
			const next = new Map(previous);
			const activeIds = new Set(actions.map((entry) => entry.id));
			let changed = false;
			for (const key of next.keys()) {
				if (!activeIds.has(key)) {
					next.delete(key);
					changed = true;
				}
			}
			return changed ? next : previous;
		});
	}, [actions]);

	const sortedActions = useMemo(() => {
		return actions
			.map((action) => ({
				action,
				total: costTotals.get(action.id) ?? Number.POSITIVE_INFINITY,
			}))
			.sort((first, second) => {
				if (first.total === second.total) {
					return first.action.name.localeCompare(second.action.name);
				}
				return first.total - second.total;
			})
			.map((entry) => entry.action);
	}, [actions, costTotals]);

	const handleTotalChange = useCallback(
		(actionId: string, total: number | null) => {
			setCostTotals((previous) => {
				const current = previous.get(actionId);
				if (total === null) {
					if (current === undefined) {
						return previous;
					}
					const next = new Map(previous);
					next.delete(actionId);
					return next;
				}
				if (current === total) {
					return previous;
				}
				const next = new Map(previous);
				next.set(actionId, total);
				return next;
			});
		},
		[],
	);

	const renderAction = useCallback(
		(action: Action) => (
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
				handlePerform={performAction}
				handleHoverCard={handleHoverCard}
				clearHoverCard={clearHoverCard}
				formatRequirement={formatRequirement}
				selectResourceDescriptor={selectResourceDescriptor}
				onCostTotalChange={handleTotalChange}
			/>
		),
		[
			summaries,
			player,
			canInteract,
			pending,
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
			handleTotalChange,
		],
	);

	return <>{sortedActions.map(renderAction)}</>;
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
		params?: Record<string, unknown>,
	) => void;
	translationContext: ReturnType<typeof useGameEngine>['translationContext'];
	actionCostResource: string;
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
	clearHoverCard: () => void;
	formatRequirement: (requirement: string) => string;
	selectResourceDescriptor: ResourceDescriptorSelector;
	onCostTotalChange: (actionId: string, total: number | null) => void;
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
	handlePerform,
	handleHoverCard,
	clearHoverCard,
	formatRequirement,
	selectResourceDescriptor,
	onCostTotalChange,
}: GenericActionEntryProps) {
	const metadata = useActionMetadata({ actionId: action.id });
	const costs = useMemo(() => {
		const bag = metadata.costs;
		if (!bag) {
			return null;
		}
		const record: Record<string, number> = {};
		for (const [resourceKey, cost] of Object.entries(bag)) {
			record[resourceKey] = cost ?? 0;
		}
		return record;
	}, [metadata.costs]);
	const total = useMemo(() => {
		if (!costs) {
			return null;
		}
		return Object.entries(costs).reduce((sum, [resourceKey, cost]) => {
			if (resourceKey === actionCostResource) {
				return sum;
			}
			return sum + (cost ?? 0);
		}, 0);
	}, [costs, actionCostResource]);

	useEffect(() => {
		onCostTotalChange(action.id, total);
	}, [action.id, onCostTotalChange, total]);

	useEffect(() => {
		return () => {
			onCostTotalChange(action.id, null);
		};
	}, [action.id, onCostTotalChange]);

	return (
		<GenericActionCard
			action={action}
			costs={costs}
			groups={metadata.groups}
			requirementFailures={metadata.requirements}
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
			handlePerform={handlePerform}
			handleHoverCard={handleHoverCard}
			clearHoverCard={clearHoverCard}
			formatRequirement={formatRequirement}
			selectResourceDescriptor={selectResourceDescriptor}
		/>
	);
}

export default GenericActions;
