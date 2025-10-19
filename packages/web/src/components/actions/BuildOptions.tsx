import React, { useMemo } from 'react';
import type { ActionCategoryConfig } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import {
	splitSummary,
	translateRequirementFailure,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useActionMetadata } from '../../state/useActionMetadata';
import { useAnimate } from '../../utils/useAutoAnimate';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
	splitActionCostMap,
	sumUpkeep,
	type ResourceDescriptorSelector,
} from './utils';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import {
	toPerformableAction,
	type Action,
	type Building,
	type DisplayPlayer,
} from './types';
import { normalizeActionFocus } from './types';
import { useActionOptionCosts } from './useActionOptionCosts';
import ActionCategoryHeader from './ActionCategoryHeader';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface BuildOptionsProps {
	action: Action;
	category?: ActionCategoryConfig;
	isActionPhase: boolean;
	buildings: Building[];
	summaries: Map<string, Summary>;
	descriptions: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function BuildOptions({
	action,
	category,
	isActionPhase,
	buildings,
	summaries,
	descriptions,
	player,
	canInteract,
	selectResourceDescriptor,
}: BuildOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		selectors,
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { sessionView } = selectors;
	const metadata = useActionMetadata({ actionId: action.id });
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
	const actionInfo = sessionView.actions.get(action.id);
	const requirementFailures = metadata.requirements ?? [];
	const requirementsReady = metadata.requirements !== undefined;
	const requirementMessages = requirementsReady
		? requirementFailures.map((failure) =>
				translateRequirementFailure(failure, translationContext),
			)
		: ['Loading requirements…'];
	const meetsRequirements =
		requirementsReady && requirementFailures.length === 0;
	const costRequests = useMemo(
		() =>
			buildings.map((building) => ({
				key: building.id,
				params: { id: building.id } as ActionParametersPayload,
			})),
		[buildings],
	);
	const costMap = useActionOptionCosts(action.id, costRequests);
	const entries = useMemo(() => {
		const owned = player.buildings;
		return buildings
			.filter((building) => !owned.has(building.id))
			.map((building) => {
				const metadataCosts = costMap.get(building.id);
				const { costs: dynamicCosts, cleanup: dynamicCleanup } =
					splitActionCostMap(metadataCosts);
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(
					building.costs ?? {},
				)) {
					costs[costKey] = costAmount ?? 0;
				}
				for (const [costKey, costAmount] of Object.entries(dynamicCosts)) {
					if (costAmount === undefined) {
						continue;
					}
					costs[costKey] = costAmount;
				}
				const combinedUpkeep: Record<string, number> = {
					...(building.upkeep ?? {}),
					...dynamicCleanup,
				};
				const total = sumNonActionCosts(costs, actionCostResource);
				const cleanup = sumUpkeep(combinedUpkeep);
				return { building, costs, total, cleanup, upkeep: combinedUpkeep };
			})
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				if (first.cleanup !== second.cleanup) {
					return first.cleanup - second.cleanup;
				}
				return first.building.name.localeCompare(second.building.name);
			});
	}, [buildings, actionCostResource, player.buildings.size, costMap]);
	const actionHoverTitle = formatIconTitle(
		actionInfo?.icon,
		actionInfo?.name ?? action.name,
	);
	const headerIcon = category?.icon ?? actionInfo?.icon ?? action.icon;
	const headerTitle = category?.name ?? actionInfo?.name ?? action.name;
	const headerSubtitle =
		category?.description ??
		'(Effects take place on build and last until building is removed)';
	return (
		<div className="space-y-2">
			<ActionCategoryHeader
				icon={headerIcon}
				title={headerTitle}
				subtitle={headerSubtitle}
			/>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
			>
				{entries.map(({ building, costs, upkeep }) => {
					const focus = normalizeActionFocus(building.focus);
					const icon = building.icon;
					const canPay = playerHasRequiredResources(player.resources, costs);
					const summary = summaries.get(building.id);
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
						selectResourceDescriptor,
					);
					const requirementText = requirementMessages.join(', ');
					const title = !implemented
						? 'Not implemented yet'
						: !requirementsReady
							? 'Loading requirements…'
							: !meetsRequirements
								? requirementText
								: !canPay
									? (insufficientTooltip ?? 'Cannot pay costs')
									: undefined;
					const enabled =
						canPay &&
						meetsRequirements &&
						isActionPhase &&
						canInteract &&
						implemented &&
						requirementsReady;
					const hoverTitle = [
						actionHoverTitle,
						formatIconTitle(icon, building.name),
					]
						.filter(Boolean)
						.join(' - ');
					return (
						<ActionCard
							key={building.id}
							title={renderIconLabel(icon, building.name)}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirementMessages}
							requirementIcons={requirementIcons}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={focus}
							assets={translationContext.assets}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								void requests.performAction({
									action: toPerformableAction(action),
									params: { id: building.id },
								});
							}}
							onMouseEnter={() => {
								const full = descriptions.get(building.id) ?? [];
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: hoverTitle,
									effects,
									requirements: requirementMessages,
									costs,
									upkeep,
									...(description && { description }),
									...(!implemented && {
										description: 'Not implemented yet',
										descriptionClass: 'italic text-red-600',
									}),
									bgClass: HOVER_CARD_BG,
								});
							}}
							onMouseLeave={clearHoverCard}
						/>
					);
				})}
			</div>
		</div>
	);
}
