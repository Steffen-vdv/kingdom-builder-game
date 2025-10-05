import React, { useMemo } from 'react';
import type { Focus } from '@kingdom-builder/contents';
import { getActionCosts } from '@kingdom-builder/engine';
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
	getOptionalProperty,
	playerHasRequiredResources,
	sumNonActionCosts,
} from './utils';
import type { Action, Building, DisplayPlayer } from './types';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface DemolishOptionsProps {
	action: Action;
	isActionPhase: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
}

export default function DemolishOptions({
	action,
	isActionPhase,
	player,
	canInteract,
}: DemolishOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		ctx,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const entries = useMemo(() => {
		return Array.from(player.buildings)
			.map((buildingId) => {
				const rawBuilding = ctx.buildings.get(buildingId);
				if (
					typeof rawBuilding !== 'object' ||
					rawBuilding === null ||
					!('name' in rawBuilding)
				) {
					return null;
				}
				const building = rawBuilding as Building;
				const costsBag = getActionCosts(action.id, ctx, {
					id: buildingId,
				});
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(costsBag)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = sumNonActionCosts(costs, actionCostResource);
				const focus = getOptionalProperty<Focus>(rawBuilding, 'focus');
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
					focus: Focus | undefined;
				} => entry !== null,
			)
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				return first.building.name.localeCompare(second.building.name);
			});
	}, [ctx, action.id, actionCostResource, player.buildings.size]);

	if (entries.length === 0) {
		return null;
	}

	return (
		<div>
			<h3 className="font-medium">
				{ctx.actions.get(action.id)?.icon || ''}{' '}
				{ctx.actions.get(action.id)?.name}{' '}
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
					const summary = summarizeContent('building', id, ctx, {
						installed: true,
					});
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !canPay
							? (insufficientTooltip ?? 'Cannot pay costs')
							: undefined;
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const upkeep = ctx.buildings.get(id)?.upkeep;
					return (
						<ActionCard
							key={id}
							title={
								<>
									{ctx.buildings.get(id)?.icon || ''} {building.name}
								</>
							}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={[]}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={focus}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								void handlePerform(action, { id });
							}}
							onMouseEnter={() => {
								const full = describeContent('building', id, ctx, {
									installed: true,
								});
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: `${ctx.actions.get(action.id)?.icon || ''} ${
										ctx.actions.get(action.id)?.name
									} - ${ctx.buildings.get(id)?.icon || ''} ${building.name}`,
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
