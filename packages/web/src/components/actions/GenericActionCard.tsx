import React, { type Dispatch, type SetStateAction } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import type { SessionActionRequirementList } from '@kingdom-builder/protocol/session';
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
	type ResourceDescriptorSelector,
} from './utils';
import type { PendingActionState } from './GenericActions';
import { useEffectGroupOptions } from './useEffectGroupOptions';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import {
	toPerformableAction,
	type Action,
	type DisplayPlayer,
	type HoverCardData,
} from './types';
import { normalizeActionFocus } from './types';

interface GenericActionCardProps {
	action: Action;
	costs: Record<string, number> | null;
	groups: ActionEffectGroup[] | null;
	requirementFailures: SessionActionRequirementList | null;
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
	handlePerform: (
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
	costs,
	groups,
	requirementFailures,
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
}: GenericActionCardProps) {
	const costsReady = costs !== null;
	const requirementFailuresReady = requirementFailures !== null;
	const groupsReady = groups !== null;
	const safeCosts = costsReady ? costs : {};
	const safeGroups = groupsReady ? groups : [];
	const requirementList = requirementFailuresReady ? requirementFailures : [];
	const requirements = requirementList.map((failure) =>
		formatRequirement(translateRequirementFailure(failure, translationContext)),
	);
	const requirementIcons = getRequirementIcons(action.id, translationContext);
	const canPay = costsReady
		? Object.entries(safeCosts).every(
				([resourceKey, cost]) =>
					(player.resources[resourceKey] || 0) >= (cost ?? 0),
			)
		: false;
	const meetsRequirements =
		requirementFailuresReady && requirementList.length === 0;
	const summary = summaries.get(action.id);
	const implemented = (summary?.length ?? 0) > 0;
	const baseEnabled = [
		costsReady,
		requirementFailuresReady,
		groupsReady,
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
		? formatMissingResources(
				safeCosts,
				player.resources,
				selectResourceDescriptor,
			)
		: undefined;
	const requirementText = requirements.join(', ');
	const title = !implemented
		? 'Not implemented yet'
		: !requirementFailuresReady
			? 'Loading action requirements…'
			: !meetsRequirements
				? requirementText
				: !costsReady
					? 'Loading action costs…'
					: !canPay
						? (insufficientTooltip ?? 'Cannot pay costs')
						: undefined;
	const hoverBackground =
		'bg-gradient-to-br from-white/80 to-white/60 ' +
		'dark:from-slate-900/80 dark:to-slate-900/60';
	const hasGroups = safeGroups.length > 0;
	const currentGroup =
		isPending && groupsReady ? pending?.groups[pending.step] : undefined;
	const stepCount = isPending && hasGroups ? safeGroups.length : undefined;
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
			costs={safeCosts}
			playerResources={player.resources}
			actionCostResource={actionCostResource}
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
				if (safeGroups.length > 0) {
					beginSelection(action, safeGroups);
					return;
				}
				setPending(null);
				void handlePerform(toPerformableAction(action));
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
