import React, { useMemo } from 'react';
import {
	describeContent,
	splitSummary,
	summarizeContent,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
	type ResourceDescriptorSelector,
} from './utils';
import {
	toPerformableAction,
	normalizeActionFocus,
	type Action,
	type ActionFocus,
	type Building,
	type DisplayPlayer,
} from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface DemolishOptionsProps {
	action: Action;
	isActionPhase: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function DemolishOptions({
	action,
	isActionPhase,
	player,
	canInteract,
	selectResourceDescriptor,
}: DemolishOptionsProps) {
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

	const entries = useMemo(() => {
		return Array.from(player.buildings)
			.map((buildingId) => {
				const building = sessionView.buildings.get(buildingId);
				if (!building) {
					return null;
				}
				const costsBag = requests.getActionCosts(action.id, {
					id: buildingId,
				});
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(costsBag)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = sumNonActionCosts(costs, actionCostResource);
				const focus = normalizeActionFocus(building.focus);
				return { id: buildingId, building, costs, total, focus };
			})
			.filter(
				(
					entry,
				): entry is {
					id: string;
					building: Building;
					costs: Record<string, number>;
					total: number;
					focus: ActionFocus | undefined;
				} => entry !== null,
			)
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				return first.building.name.localeCompare(second.building.name);
			});
	}, [
		requests,
		sessionView.buildings,
		action.id,
		actionCostResource,
		player.buildings.size,
	]);

	if (entries.length === 0) {
		return null;
	}

	const actionInfo = sessionView.actions.get(action.id);
	const actionHoverTitle = formatIconTitle(
		actionInfo?.icon,
		actionInfo?.name ?? action.name,
	);
	return (
		<div>
			<h3 className="font-medium flex flex-wrap items-center gap-2">
				{renderIconLabel(actionInfo?.icon, actionInfo?.name ?? action.name)}
				<span className="italic text-sm font-normal">
					(Removes a structure and its ongoing benefits)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ id, building, costs, focus }) => {
					const requirements: string[] = [];
					const canPay = playerHasRequiredResources(player.resources, costs);
					const summary = summarizeContent('building', id, translationContext, {
						installed: true,
					});
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
						selectResourceDescriptor,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !canPay
							? (insufficientTooltip ?? 'Cannot pay costs')
							: undefined;
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const upkeep = building.upkeep;
					const hoverTitle = [
						actionHoverTitle,
						formatIconTitle(building.icon, building.name),
					]
						.filter(Boolean)
						.join(' - ');
					return (
						<ActionCard
							key={id}
							title={renderIconLabel(building.icon, building.name)}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={[]}
							summary={summary}
							assets={translationContext.assets}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={focus}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								void requests.performAction({
									action: toPerformableAction(action),
									params: { id },
								});
							}}
							onMouseEnter={() => {
								const full = describeContent(
									'building',
									id,
									translationContext,
									{
										installed: true,
									},
								);
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
