import React, { useMemo } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
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
import { useActionOptionCosts } from './useActionOptionCosts';

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
	const buildingIds = useMemo(
		() => Array.from(player.buildings),
		[player.buildings],
	);
	const costRequests = useMemo(
		() =>
			buildingIds.map((buildingId) => ({
				key: buildingId,
				params: { id: buildingId } as ActionParametersPayload,
			})),
		[buildingIds],
	);
	const costMap = useActionOptionCosts(action.id, costRequests);
	const entries = useMemo(() => {
		return buildingIds
			.map((buildingId) => {
				const building = sessionView.buildings.get(buildingId);
				if (!building) {
					return null;
				}
				const metadataCosts = costMap.get(buildingId);
				const costsReady = metadataCosts !== undefined;
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(
					metadataCosts ?? {},
				)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = costsReady
					? sumNonActionCosts(costs, actionCostResource)
					: Number.POSITIVE_INFINITY;
				const focus = normalizeActionFocus(building.focus);
				return { id: buildingId, building, costs, total, focus, costsReady };
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
					costsReady: boolean;
				} => entry !== null,
			)
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				return first.building.name.localeCompare(second.building.name);
			});
	}, [buildingIds, sessionView.buildings, actionCostResource, costMap]);

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
				{entries.map(({ id, building, costs, focus, costsReady }) => {
					const requirements: string[] = [];
					const canPay =
						costsReady && playerHasRequiredResources(player.resources, costs);
					const summary = summarizeContent('building', id, translationContext, {
						installed: true,
					});
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = costsReady
						? formatMissingResources(
								costs,
								player.resources,
								selectResourceDescriptor,
							)
						: undefined;
					const title = !implemented
						? 'Not implemented yet'
						: !costsReady
							? 'Loading costs…'
							: !canPay
								? (insufficientTooltip ?? 'Cannot pay costs')
								: undefined;
					const enabled =
						costsReady && canPay && isActionPhase && canInteract && implemented;
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
