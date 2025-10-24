import React, {
	useEffect,
	useMemo,
	type Dispatch,
	type SetStateAction,
} from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupChoiceMap,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import type { Summary, TranslationContext } from '../../translation';
import { useActionMetadata } from '../../state/useActionMetadata';
import GenericActionCard from './GenericActionCard';
import { splitActionCostMap, sumNonActionCosts, sumUpkeep } from './utils';
import type { ResourceDescriptorSelector } from './utils';
import { type Action, type DisplayPlayer, type HoverCardData } from './types';

export interface PendingActionState {
	action: Action;
	groups: ActionEffectGroup[];
	step: number;
	params: Record<string, unknown>;
	choices: ActionEffectGroupChoiceMap;
}

export interface ActionSortMetrics {
	cost: number | null;
	cleanup: number | null;
}

export interface GenericActionEntryProps {
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

export function GenericActionEntry({
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
	const metadata = useActionMetadata({
		actionId: action.id,
		playerId: player.id,
	});
	const { costs: actionCosts, cleanup: cleanupCosts } = useMemo(
		() => splitActionCostMap(metadata.costs),
		[metadata.costs],
	);
	const total = useMemo(() => {
		if (!metadata.costs) {
			return null;
		}
		return sumNonActionCosts(actionCosts, selectResourceDescriptor, {
			actionCostResource,
		});
	}, [
		metadata.costs,
		actionCosts,
		selectResourceDescriptor,
		actionCostResource,
	]);
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
