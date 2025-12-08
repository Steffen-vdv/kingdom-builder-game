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
	type ResourceDescriptorSelector,
} from './utils';
import type { PendingActionState } from './GenericActionEntry';
import { useEffectGroupOptions } from './useEffectGroupOptions';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import { type Action, type DisplayPlayer, type HoverCardData } from './types';
import { normalizeActionFocus } from './types';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import { getActionAvailability } from './getActionAvailability';
import { resolveInstallationTarget } from './actionSummaryHelpers';

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
	const summary = summaries.get(action.id);
	const availability = useMemo(
		() =>
			getActionAvailability({
				metadata,
				player,
				canInteract,
				summary,
			}),
		[metadata, player, canInteract, summary],
	);
	const { costs, cleanup: cleanupCosts } = availability;
	const costsLoading = metadata.loading.costs;
	const requirementsLoading = metadata.loading.requirements;
	const groupsLoading = metadata.loading.groups;
	const costsReady = availability.costsReady;
	const hasCleanupCosts = availability.hasCleanupCosts;
	const requirementFailures = availability.requirementFailures;
	const requirementMessages = requirementFailures.map((failure) =>
		formatRequirement(translateRequirementFailure(failure, translationContext)),
	);
	const requirements =
		requirementMessages.length > 0
			? requirementMessages
			: metadata.requirements !== undefined
				? []
				: ['Loading requirements…'];
	const requirementIcons = getRequirementIcons(action.id, translationContext);
	const groups = metadata.groups ?? [];
	const groupsReady = !groupsLoading;
	const baseEnabled = availability.performable;
	const isPending = pending?.action.id === action.id;
	let cardEnabled = baseEnabled && !pending;
	if (isPending) {
		cardEnabled = true;
	}
	const insufficientTooltip = costsReady
		? formatMissingResources(costs, player.values, selectResourceDescriptor)
		: 'Loading costs…';
	const requirementText = requirements.join(', ');
	const title = !availability.implemented
		? 'Not implemented yet'
		: requirementsLoading
			? 'Loading requirements…'
			: costsLoading
				? 'Loading costs…'
				: !availability.meetsRequirements
					? requirementText
					: !availability.canPay
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
	const notImplementedDetails = availability.implemented
		? undefined
		: {
				description: 'Not implemented yet',
				descriptionClass: 'italic text-red-600',
			};
	const optionCards = useEffectGroupOptions({
		currentGroup,
		pendingParams: pending?.params,
		translationContext,
		formatRequirement,
		handleOptionSelect,
		clearHoverCard,
		handleHoverCard,
		hoverBackground,
		playerId: player.id,
	});
	const actionIcon = typeof action.icon === 'string' ? action.icon : undefined;
	const actionFocus = normalizeActionFocus(action.focus);
	const hoverTitle = formatIconTitle(actionIcon, action.name);
	const hoverContent = describeContent('action', action.id, translationContext);
	let { effects, description } = splitSummary(hoverContent);
	const installationTarget = useMemo(
		() => resolveInstallationTarget(action.id, translationContext),
		[action.id, translationContext],
	);
	if (installationTarget) {
		try {
			const installationSummary = describeContent(
				installationTarget.type,
				installationTarget.id,
				translationContext,
			);
			const installationSplit = splitSummary(installationSummary);
			if (installationSplit.effects.length > 0) {
				effects = installationSplit.effects;
			}
			if (installationSplit.description?.length) {
				description = installationSplit.description;
			}
		} catch {
			/* ignore missing installation descriptions */
		}
	}
	const createHoverDetails = (): HoverCardData => ({
		title: hoverTitle,
		effects,
		requirements,
		costs,
		...(hasCleanupCosts ? { upkeep: cleanupCosts } : {}),
		...(description && { description }),
		...(notImplementedDetails ?? {}),
		bgClass: hoverBackground,
		...(hasGroups ? { multiStep: true } : {}),
	});
	const handleMouseEnter = isPending
		? undefined
		: () => {
				handleHoverCard(createHoverDetails());
			};
	return (
		<ActionCard
			key={action.id}
			title={renderIconLabel(actionIcon, action.name)}
			costs={costs}
			playerResources={player.values}
			actionCostResource={actionCostResource}
			upkeep={hasCleanupCosts ? cleanupCosts : undefined}
			requirements={requirements}
			requirementIcons={requirementIcons}
			summary={summary}
			implemented={availability.implemented}
			enabled={cardEnabled}
			tooltip={title}
			focus={actionFocus}
			assets={translationContext.assets}
			resourceMetadata={translationContext.resourceMetadata}
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
			onMouseEnter={handleMouseEnter}
			onMouseLeave={isPending ? undefined : clearHoverCard}
		/>
	);
}

export default GenericActionCard;
