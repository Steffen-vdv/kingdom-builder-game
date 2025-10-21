import React, { useMemo } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import { describeContent, splitSummary, type Summary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { useSlotMetadata } from '../../contexts/RegistryMetadataContext';
import ActionCard from './ActionCard';
import type { ActionCategoryDescriptor } from './ActionCategoryHeader';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
	splitActionCostMap,
	sumUpkeep,
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
import { CATEGORY_SUBTITLE_CLASSES } from './actionsPanelStyles';

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
	actions: Action[];
	isActionPhase: boolean;
	developments: Development[];
	summaries: Map<string, Summary>;
	hasDevelopLand: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	category: ActionCategoryDescriptor;
}

export default function DevelopOptions({
	actions,
	isActionPhase,
	developments,
	summaries,
	hasDevelopLand,
	player,
	canInteract,
	selectResourceDescriptor,
	category,
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
	const { subtitle } = category;
	const landIdForCost = player.lands.find((land) => land.slotsFree > 0)?.id;
	const developmentMap = useMemo(
		() =>
			new Map(developments.map((development) => [development.id, development])),
		[developments],
	);
	const costRequests = useMemo(() => {
		const params = landIdForCost
			? ({ landId: landIdForCost } as ActionParametersPayload)
			: undefined;
		return actions.map((actionDefinition) => ({
			key: actionDefinition.id,
			actionId: actionDefinition.id,
			params,
		}));
	}, [actions, landIdForCost]);
	const costMap = useActionOptionCosts(costRequests);
	const entries = useMemo(() => {
		const extractDevelopmentId = (
			actionDefinition: Action,
		): string | undefined => {
			const effects = actionDefinition.effects ?? [];
			for (const effectDefinition of effects) {
				if (
					!effectDefinition ||
					typeof effectDefinition !== 'object' ||
					Array.isArray(effectDefinition)
				) {
					continue;
				}
				const typeProperty =
					'type' in effectDefinition
						? (effectDefinition as { type?: unknown }).type
						: undefined;
				if (typeProperty !== 'development') {
					continue;
				}
				const params =
					'params' in effectDefinition &&
					typeof (effectDefinition as { params?: unknown }).params ===
						'object' &&
					(effectDefinition as { params?: object }).params !== null
						? ((effectDefinition as { params?: object }).params as {
								id?: unknown;
							})
						: undefined;
				const candidate = params?.id;
				if (typeof candidate === 'string') {
					return candidate;
				}
			}
			return undefined;
		};
		return actions
			.map((actionDefinition) => {
				const developmentId = extractDevelopmentId(actionDefinition);
				if (!developmentId) {
					return undefined;
				}
				const development = developmentMap.get(developmentId);
				if (!development) {
					return undefined;
				}
				const metadataCosts = costMap.get(actionDefinition.id);
				const { costs: dynamicCosts, cleanup: dynamicCleanup } =
					splitActionCostMap(metadataCosts);
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(dynamicCosts)) {
					costs[costKey] = costAmount ?? 0;
				}
				const combinedUpkeep: Record<string, number> = {
					...(development.upkeep ?? {}),
					...dynamicCleanup,
				};
				const total = sumNonActionCosts(costs, actionCostResource);
				const cleanup = sumUpkeep(combinedUpkeep);
				return {
					action: actionDefinition,
					development,
					costs,
					total,
					cleanup,
					upkeep: combinedUpkeep,
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				if (first.cleanup !== second.cleanup) {
					return first.cleanup - second.cleanup;
				}
				return first.development.name.localeCompare(second.development.name);
			});
	}, [
		actions,
		developmentMap,
		costMap,
		actionCostResource,
		sessionView.actions,
	]);
	return (
		<div className="space-y-3">
			{subtitle ? (
				<p className={CATEGORY_SUBTITLE_CLASSES}>{subtitle}</p>
			) : null}
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
			>
				{entries.map(({ action: actionOption, development, costs, upkeep }) => {
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
					const actionInfo = sessionView.actions.get(actionOption.id);
					const actionHoverTitle = formatIconTitle(
						actionInfo?.icon,
						actionInfo?.name ?? actionOption.name,
					);
					const hoverTitle = [
						actionHoverTitle,
						formatIconTitle(development.icon, development.name),
					]
						.filter(Boolean)
						.join(' - ');
					const enabled = canPay && isActionPhase && canInteract && implemented;
					return (
						<ActionCard
							key={actionOption.id}
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
								if (!landId) {
									return;
								}
								void requests.performAction({
									action: toPerformableAction(actionOption),
									params: { landId },
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
