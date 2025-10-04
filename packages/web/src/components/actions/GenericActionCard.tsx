import React, { type Dispatch, type SetStateAction } from 'react';
import {
	getActionRequirements,
	type ActionEffectGroup,
	type ActionEffectGroupOption,
	type EngineContext,
} from '@kingdom-builder/engine';
import { describeContent, splitSummary, type Summary } from '../../translation';
import { type ResourceKey } from '@kingdom-builder/contents';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import { formatMissingResources } from './utils';
import type { Action, DisplayPlayer } from './ActionsPanel';
import type { PendingActionState } from './GenericActions';
import { useEffectGroupOptions } from './useEffectGroupOptions';
import type { HoverCardData } from './types';

interface GenericActionCardProps {
	action: Action;
	costs: Record<string, number>;
	groups: ActionEffectGroup[];
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
		resolvedParams?: Record<string, unknown>,
	) => void;
	context: EngineContext;
	actionCostResource: ResourceKey;
	handlePerform: (
		action: Action,
		params?: Record<string, unknown>,
	) => Promise<void>;
	handleHoverCard: (data: HoverCardData) => void;
	clearHoverCard: () => void;
	formatRequirement: (requirement: string) => string;
}

function GenericActionCard({
	action,
	costs,
	groups,
	summaries,
	player,
	canInteract,
	pending,
	setPending,
	cancelPending,
	beginSelection,
	handleOptionSelect,
	context,
	actionCostResource,
	handlePerform,
	handleHoverCard,
	clearHoverCard,
	formatRequirement,
}: GenericActionCardProps) {
	const requirements = getActionRequirements(action.id, context).map(
		formatRequirement,
	);
	const requirementIcons = getRequirementIcons(action.id, context);
	const canPay = Object.entries(costs).every(
		([resourceKey, cost]) =>
			(player.resources[resourceKey] || 0) >= (cost ?? 0),
	);
	const meetsRequirements = requirements.length === 0;
	const summary = summaries.get(action.id);
	const implemented = (summary?.length ?? 0) > 0;
	const baseEnabled = [
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
	const insufficientTooltip = formatMissingResources(costs, player.resources);
	const requirementText = requirements.join(', ');
	const title = !implemented
		? 'Not implemented yet'
		: !meetsRequirements
			? requirementText
			: !canPay
				? (insufficientTooltip ?? 'Cannot pay costs')
				: undefined;
	const hoverBackground =
		'bg-gradient-to-br from-white/80 to-white/60 ' +
		'dark:from-slate-900/80 dark:to-slate-900/60';
	const hasGroups = groups.length > 0;
	const currentGroup = isPending ? pending?.groups[pending.step] : undefined;
	const stepCount = isPending && hasGroups ? groups.length : undefined;
	const stepIndex = stepCount
		? Math.min(stepCount, (pending?.step ?? 0) + 1)
		: undefined;
	const optionCards = useEffectGroupOptions({
		currentGroup,
		pendingParams: pending?.params,
		context,
		formatRequirement,
		handleOptionSelect,
		clearHoverCard,
		handleHoverCard,
		hoverBackground,
	});
	const rawAction = context.actions.get(action.id);
	let actionIcon = '';
	let actionFocus: Action['focus'] | undefined;
	if (rawAction && typeof rawAction === 'object') {
		const possible = rawAction as {
			icon?: unknown;
			focus?: Action['focus'];
		};
		if (typeof possible.icon === 'string') {
			actionIcon = possible.icon;
		}
		actionFocus = possible.focus;
	}
	const hoverTitle = `${actionIcon} ${action.name}`;
	const hoverContent = describeContent('action', action.id, context);
	const { effects, description } = splitSummary(hoverContent);
	return (
		<ActionCard
			key={action.id}
			title={
				<>
					{actionIcon} {action.name}
				</>
			}
			costs={costs}
			playerResources={player.resources}
			actionCostResource={actionCostResource}
			requirements={requirements}
			requirementIcons={requirementIcons}
			summary={summary}
			implemented={implemented}
			enabled={cardEnabled}
			tooltip={title}
			focus={actionFocus}
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
				if (groups.length > 0) {
					beginSelection(action, groups);
					return;
				}
				setPending(null);
				void handlePerform(action);
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
