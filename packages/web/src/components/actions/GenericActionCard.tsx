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
import ActionCard, { type ActionCardOption } from './ActionCard';
import { formatMissingResources } from './utils';
import type { Action, DisplayPlayer } from './ActionsPanel';
import type { PendingActionState } from './GenericActions';
import type { useGameEngine } from '../../state/GameContext';

function buildOptionCards(
	group: ActionEffectGroup | undefined,
	handleOptionSelect: (
		group: ActionEffectGroup,
		option: ActionEffectGroupOption,
	) => void,
): ActionCardOption[] | undefined {
	if (!group) {
		return undefined;
	}
	return group.options.map((option) => {
		const card: ActionCardOption = {
			id: option.id,
			label: option.label,
			onSelect: () => handleOptionSelect(group, option),
		};
		if (option.icon) {
			card.icon = option.icon;
		}
		if (option.summary) {
			card.summary = option.summary;
		}
		if (option.description) {
			card.description = option.description;
		}
		return card;
	});
}

type GameEngineApi = ReturnType<typeof useGameEngine>;
type HoverCardData = Parameters<GameEngineApi['handleHoverCard']>[0];

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
	const stepCount = groups.length > 0 ? groups.length : undefined;
	const stepIndex = stepCount
		? isPending
			? Math.min(stepCount, (pending?.step ?? 0) + 1)
			: 1
		: undefined;
	const currentGroup = isPending ? pending?.groups[pending.step] : undefined;
	const optionCards = buildOptionCards(currentGroup, handleOptionSelect);
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
	const hoverBackground =
		'bg-gradient-to-br from-white/80 to-white/60 ' +
		'dark:from-slate-900/80 dark:to-slate-900/60';
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
