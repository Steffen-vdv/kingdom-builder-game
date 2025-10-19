import React, { useMemo } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import { describeContent, splitSummary, type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useSlotMetadata } from '../../contexts/RegistryMetadataContext';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
	sumCleanupCosts,
	type ResourceDescriptorSelector,
} from './utils';
import {
	toPerformableAction,
	type Action,
	type Development,
	type DisplayPlayer,
} from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import { useActionOptionCosts } from './useActionOptionCosts';

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
		selectors,
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { sessionView } = selectors;
	const slotMetadata = useSlotMetadata();
	const slotDescriptor = useMemo(() => slotMetadata.select(), [slotMetadata]);
	const landIdForCost = player.lands[0]?.id as string;
	const actionInfo = sessionView.actions.get(action.id);
	const costRequests = useMemo(
		() =>
			developments.map((development) => ({
				key: development.id,
				params: {
					id: development.id,
					...(landIdForCost ? { landId: landIdForCost } : {}),
				} as ActionParametersPayload,
			})),
		[developments, landIdForCost],
	);
	const costMap = useActionOptionCosts(action.id, costRequests);
	const entries = useMemo(() => {
		return developments
			.map((development, index) => ({ development, index }))
			.map(({ development, index }) => {
				const metadataCosts = costMap.get(development.id);
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(
					metadataCosts ?? {},
				)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = sumNonActionCosts(costs, actionCostResource);
				const cleanup = sumCleanupCosts(development.upkeep);
				return { development, costs, total, cleanup, index };
			})
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				if (first.cleanup !== second.cleanup) {
					return first.cleanup - second.cleanup;
				}
				const nameComparison = first.development.name.localeCompare(
					second.development.name,
				);
				if (nameComparison !== 0) {
					return nameComparison;
				}
				return first.index - second.index;
			});
	}, [developments, actionCostResource, costMap]);
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
							assets={translationContext.assets}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								const landId = player.lands.find(
									(land) => land.slotsFree > 0,
								)?.id;
								void requests.performAction({
									action: toPerformableAction(action),
									params: {
										id: development.id,
										landId,
									},
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
