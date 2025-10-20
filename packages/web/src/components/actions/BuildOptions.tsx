import React, { useMemo } from 'react';
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

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface BuildOptionsProps {
	action: Action;
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
	const requirementMessages = requirementFailures.map((failure) =>
		translateRequirementFailure(failure, translationContext),
	);
	const requirementsAvailable = metadata.requirements !== undefined;
	const requirementsLoading = metadata.loading.requirements;
	const requirementDisplay =
		requirementMessages.length > 0
			? requirementMessages
			: requirementsAvailable
				? []
				: ['Loading requirements…'];
	const meetsRequirements =
		!requirementsLoading && requirementFailures.length === 0;
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
	return (
		<div>
			<h3 className="font-medium flex flex-wrap items-center gap-2">
				{renderIconLabel(actionInfo?.icon, actionInfo?.name ?? action.name)}
				<span className="italic text-sm font-normal">
					(Effects take place on build and last until building is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
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
					const loadingRequirements =
						!requirementsAvailable && requirementsLoading;
					const title = !implemented
						? 'Not implemented yet'
						: loadingRequirements
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
						!requirementsLoading;
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
							requirements={requirementDisplay}
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
