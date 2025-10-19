import React, { useMemo } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import {
	splitSummary,
	translateRequirementFailure,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
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
		session,
		selectors,
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { sessionView } = selectors;
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
	const actionInfo = sessionView.actions.get(action.id);
	const requirementFailures = session.getActionRequirements(action.id);
	const requirements = requirementFailures.map((failure) =>
		translateRequirementFailure(failure, translationContext),
	);
	const meetsRequirements = requirements.length === 0;
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
				const costsReady = metadataCosts !== undefined;
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(
					building.costs ?? {},
				)) {
					costs[costKey] = costAmount ?? 0;
				}
				for (const [costKey, costAmount] of Object.entries(
					metadataCosts ?? {},
				)) {
					if (costAmount === undefined) {
						continue;
					}
					costs[costKey] = costAmount;
				}
				const total = costsReady
					? sumNonActionCosts(costs, actionCostResource)
					: Number.POSITIVE_INFINITY;
				return { building, costs, total, costsReady };
			})
			.sort((first, second) => first.total - second.total);
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
				{entries.map(({ building, costs, costsReady }) => {
					const upkeep = building.upkeep;
					const focus = normalizeActionFocus(building.focus);
					const icon = building.icon;
					const canPay =
						costsReady && playerHasRequiredResources(player.resources, costs);
					const summary = summaries.get(building.id);
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = costsReady
						? formatMissingResources(
								costs,
								player.resources,
								selectResourceDescriptor,
							)
						: undefined;
					const requirementText = requirements.join(', ');
					const title = !implemented
						? 'Not implemented yet'
						: !costsReady
							? 'Loading costs…'
							: !meetsRequirements
								? requirementText
								: !canPay
									? (insufficientTooltip ?? 'Cannot pay costs')
									: undefined;
					const enabled =
						costsReady &&
						canPay &&
						meetsRequirements &&
						isActionPhase &&
						canInteract &&
						implemented;
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
							requirements={requirements}
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
									requirements,
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
