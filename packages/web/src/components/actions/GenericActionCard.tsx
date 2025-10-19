import React, { useMemo, type Dispatch, type SetStateAction } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import {
	describeContent,
	splitSummary,
	translateRequirementFailure,
	type Summary,
	type TranslationContext,
} from '../../translation';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	splitActionCostMap,
	type ResourceDescriptorSelector,
} from './utils';
import type { PendingActionState } from './GenericActions';
import { useEffectGroupOptions } from './useEffectGroupOptions';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import { type Action, type DisplayPlayer, type HoverCardData } from './types';
import { normalizeActionFocus } from './types';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';

interface GenericActionCardProps {
	action: Action;
	metadata: UseActionMetadataResult;
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
}

function GenericActionCard({
	action,
	metadata,
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
}: GenericActionCardProps) {
	const { costs, cleanup: cleanupCosts } = useMemo(
		() => splitActionCostMap(metadata.costs),
		[metadata.costs],
	);
	const costsReady = metadata.costs !== undefined;
	const hasCleanupCosts = Object.keys(cleanupCosts).length > 0;
	const requirementsReady = metadata.requirements !== undefined;
	const requirementFailures = metadata.requirements ?? [];
	const requirements = requirementsReady
		? requirementFailures.map((failure) =>
				formatRequirement(
					translateRequirementFailure(failure, translationContext),
				),
			)
		: ['Loading requirements…'];
	const requirementIcons = getRequirementIcons(action.id, translationContext);
	const canPay = costsReady
		? Object.entries(costs).every(
				([resourceKey, cost]) =>
					(player.resources[resourceKey] || 0) >= (cost ?? 0),
			)
		: false;
	const meetsRequirements =
		requirementsReady && requirementFailures.length === 0;
	const summary = summaries.get(action.id);
	const implemented = (summary?.length ?? 0) > 0;
	const groups = metadata.groups ?? [];
	const groupsReady = metadata.groups !== undefined;
	const metadataReady = costsReady && requirementsReady && groupsReady;
	const baseEnabled = [
		metadataReady,
		canPay,
		meetsRequirements,
		canInteract,
		implemented,
	].every(Boolean);
	const isPending = pending?.action.id === action.id;
	let cardEnabled = baseEnabled && !pending;
	if (isPending) {
		cardEnabled = true;
	}
	const insufficientTooltip = costsReady
		? formatMissingResources(costs, player.resources, selectResourceDescriptor)
		: 'Loading costs…';
	const requirementText = requirements.join(', ');
	const title = !implemented
		? 'Not implemented yet'
		: !requirementsReady
			? 'Loading requirements…'
			: !costsReady
				? 'Loading costs…'
				: !meetsRequirements
					? requirementText
					: !canPay
						? (insufficientTooltip ?? 'Cannot pay costs')
						: undefined;
	const hoverBackground =
		'bg-gradient-to-br from-white/80 to-white/60 ' +
		'dark:from-slate-900/80 dark:to-slate-900/60';
	const hasGroups = groupsReady && groups.length > 0;
	const currentGroup = isPending ? pending?.groups[pending.step] : undefined;
	const stepCount = isPending && hasGroups ? groups.length : undefined;
	const stepIndex = stepCount
		? Math.min(stepCount, (pending?.step ?? 0) + 1)
		: undefined;
	const optionCards = useEffectGroupOptions({
		currentGroup,
		pendingParams: pending?.params,
		translationContext,
		formatRequirement,
		handleOptionSelect,
		clearHoverCard,
		handleHoverCard,
		hoverBackground,
	});
	const actionIcon = typeof action.icon === 'string' ? action.icon : undefined;
	const actionFocus = normalizeActionFocus(action.focus);
	const hoverTitle = formatIconTitle(actionIcon, action.name);
	const hoverContent = describeContent('action', action.id, translationContext);
	const { effects, description } = splitSummary(hoverContent);
	return (
		<ActionCard
			key={action.id}
			title={renderIconLabel(actionIcon, action.name)}
			costs={costs}
			playerResources={player.resources}
			actionCostResource={actionCostResource}
			upkeep={hasCleanupCosts ? cleanupCosts : undefined}
			requirements={requirements}
			requirementIcons={requirementIcons}
			summary={summary}
			implemented={implemented}
			enabled={cardEnabled}
			tooltip={title}
			focus={actionFocus}
			assets={translationContext.assets}
			variant={isPending ? 'back' : 'front'}
			multiStep={hasGroups}
			stepCount={stepCount}
			stepIndex={stepIndex}
			promptTitle={currentGroup?.title}
			promptSummary={currentGroup?.summary}
			promptDescription={currentGroup?.description}
			options={optionCards}
			onCancel={isPending ? cancelPending : undefined}
			onClick={() => {
				if (!canInteract || !baseEnabled) {
					return;
				}
				if (groupsReady && groups.length > 0) {
					beginSelection(action, groups);
					return;
				}
				setPending(null);
				void performAction(action);
			}}
			onMouseEnter={
				isPending
					? undefined
					: () => {
							const hoverDetails: HoverCardData = {
								title: hoverTitle,
								effects,
								requirements,
								costs,
								...(hasCleanupCosts ? { upkeep: cleanupCosts } : {}),
								...(description && { description }),
								...(!implemented && {
									description: 'Not implemented yet',
									descriptionClass: 'italic text-red-600',
								}),
								bgClass: hoverBackground,
							};
							handleHoverCard(hoverDetails);
						}
			}
			onMouseLeave={isPending ? undefined : clearHoverCard}
		/>
	);
}

export default GenericActionCard;
