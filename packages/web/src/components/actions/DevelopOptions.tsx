import React, { useMemo } from 'react';
import { describeContent, splitSummary, type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useSlotMetadata } from '../../contexts/RegistryMetadataContext';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
	type ResourceDescriptorSelector,
} from './utils';
import {
	toPerformableAction,
	type Action,
	type Development,
	type DisplayPlayer,
} from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

function formatLandRequirement(
	prefix: string,
	slotLabel: string,
	slotIcon?: string,
): string {
	const parts = [prefix];
	if (slotIcon) {
		parts.push(slotIcon);
	}
	parts.push(slotLabel, 'on available land');
	return parts.join(' ');
}

interface DevelopOptionsProps {
	action: Action;
	isActionPhase: boolean;
	developments: Development[];
	summaries: Map<string, Summary>;
	hasDevelopLand: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function DevelopOptions({
	action,
	isActionPhase,
	developments,
	summaries,
	hasDevelopLand,
	player,
	canInteract,
	selectResourceDescriptor,
}: DevelopOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		session,
		sessionView,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const slotMetadata = useSlotMetadata();
	const slotDescriptor = slotMetadata.select();
	const landIdForCost = player.lands[0]?.id as string;
	const actionInfo = sessionView.actions.get(action.id);
	const entries = useMemo(() => {
		return developments
			.map((development) => {
				const costsBag = session.getActionCosts(action.id, {
					id: development.id,
					landId: landIdForCost,
				});
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(costsBag)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = sumNonActionCosts(costs, actionCostResource);
				return { development, costs, total };
			})
			.sort((first, second) => first.total - second.total);
	}, [developments, session, action.id, landIdForCost, actionCostResource]);
	const actionHoverTitle = formatIconTitle(
		actionInfo?.icon,
		actionInfo?.name ?? action.name,
	);
	return (
		<div>
			<h3 className="font-medium flex flex-wrap items-center gap-2">
				{renderIconLabel(actionInfo?.icon, actionInfo?.name ?? action.name)}
				<span className="italic text-sm font-normal">
					(Effects take place on build and last until development is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ development, costs }) => {
					const upkeep = development.upkeep;
					const focus = development.focus;
					const developLandRequirement = formatLandRequirement(
						'Requires',
						slotDescriptor.label,
						slotDescriptor.icon,
					);
					const requirements = hasDevelopLand ? [] : [developLandRequirement];
					const canPay =
						hasDevelopLand &&
						playerHasRequiredResources(player.resources, costs);
					const summary = summaries.get(development.id);
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
						selectResourceDescriptor,
					);
					const missingLandTooltip = formatLandRequirement(
						'No',
						slotDescriptor.label,
						slotDescriptor.icon,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !hasDevelopLand
							? missingLandTooltip
							: !canPay
								? (insufficientTooltip ?? 'Cannot pay costs')
								: undefined;
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const hoverTitle = [
						actionHoverTitle,
						formatIconTitle(development.icon, development.name),
					]
						.filter(Boolean)
						.join(' - ');
					return (
						<ActionCard
							key={development.id}
							title={renderIconLabel(development.icon, development.name)}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={
								slotDescriptor.icon ? [slotDescriptor.icon] : []
							}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={focus}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								const landId = player.lands.find(
									(land) => land.slotsFree > 0,
								)?.id;
								void handlePerform(toPerformableAction(action), {
									id: development.id,
									landId,
								});
							}}
							onMouseEnter={() => {
								const full = describeContent(
									'development',
									development.id,
									translationContext,
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
