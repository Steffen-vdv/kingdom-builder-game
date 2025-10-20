import React, {
	useEffect,
	useMemo,
	type Dispatch,
	type SetStateAction,
} from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import GenericActionCard from './GenericActionCard';
import type { Summary, TranslationContext } from '../../translation';
import { splitActionCostMap, sumNonActionCosts, sumUpkeep } from './utils';
import type { ResourceDescriptorSelector } from './utils';
import type { Action, DisplayPlayer, HoverCardData } from './types';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import type { PendingActionState } from './GenericActions';

export interface ActionSortMetrics {
	cost: number | null;
	cleanup: number | null;
}

interface GenericActionEntryProps {
	action: Action;
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	metadata: UseActionMetadataResult;
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

export default function GenericActionEntry({
	action,
	summaries,
	player,
	canInteract,
	metadata,
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
