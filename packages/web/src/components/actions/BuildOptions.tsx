import React, { useMemo } from 'react';
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
import type { ActionCategoryDescriptor } from './ActionCategoryHeader';
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
import { CATEGORY_SUBTITLE_CLASSES } from './actionsPanelStyles';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface BuildOptionsProps {
	actions: Action[];
	isActionPhase: boolean;
	buildings: Building[];
	summaries: Map<string, Summary>;
	descriptions: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	category: ActionCategoryDescriptor;
}

export default function BuildOptions({
	actions,
	isActionPhase,
	buildings,
	summaries,
	descriptions,
	player,
	canInteract,
	selectResourceDescriptor,
	category,
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
	const buildingLookup = useMemo(
		() => new Map(buildings.map((building) => [building.id, building])),
		[buildings],
	);
	const getBuildingId = useMemo(
		() => (actionId: string) =>
			actionId.startsWith('build:')
				? actionId.slice('build:'.length)
				: undefined,
		[],
	);
	const buildingActions = useMemo(
		() =>
			actions.filter((action) => {
				const buildingId = getBuildingId(action.id);
				if (!buildingId) {
					return false;
				}
				return buildingLookup.has(buildingId);
			}),
		[actions, buildingLookup],
	);
	const metadataAction = buildingActions[0];
	const metadata = useActionMetadata({
		actionId: metadataAction ? metadataAction.id : null,
	});
	const requirementIcons = useMemo(
		() =>
			metadataAction
				? getRequirementIcons(metadataAction.id, translationContext)
				: [],
		[metadataAction, translationContext],
	);
	const { subtitle } = category;
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
			buildingActions.map((action) => ({
				key: action.id,
				actionId: action.id,
			})),
		[buildingActions],
	);
	const costMap = useActionOptionCosts(costRequests);
	const entries = useMemo(() => {
		const owned = player.buildings;
		return buildingActions
			.map((action) => {
				const buildingId = getBuildingId(action.id);
				if (!buildingId || owned.has(buildingId)) {
					return null;
				}
				const building = buildingLookup.get(buildingId);
				if (!building) {
					return null;
				}
				const metadataCosts = costMap.get(action.id);
				const { costs: dynamicCosts, cleanup: dynamicCleanup } =
					splitActionCostMap(metadataCosts);
				const baseCosts: Record<string, number> = {};
				const actionBaseCosts = action.baseCosts ?? {};
				for (const [resourceKey, amount] of Object.entries(
					building.costs ?? {},
				)) {
					baseCosts[resourceKey] = Number(amount ?? 0);
				}
				for (const [resourceKey, amount] of Object.entries(actionBaseCosts)) {
					baseCosts[resourceKey] = Number(amount ?? 0);
				}
				const costs: Record<string, number> = {};
				for (const [resourceKey, amount] of Object.entries(baseCosts)) {
					costs[resourceKey] = Number(amount ?? 0);
				}
				for (const [resourceKey, amount] of Object.entries(dynamicCosts)) {
					if (amount === undefined) {
						continue;
					}
					costs[resourceKey] = Number(amount ?? 0);
				}
				const combinedUpkeep: Record<string, number> = {
					...(building.upkeep ?? {}),
					...dynamicCleanup,
				};
				const total = sumNonActionCosts(costs, actionCostResource);
				const cleanup = sumUpkeep(combinedUpkeep);
				const actionInfo = sessionView.actions.get(action.id);
				return {
					action,
					actionInfo,
					building,
					costs,
					total,
					cleanup,
					upkeep: combinedUpkeep,
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null)
			.sort((first, second) => {
				if (first.total !== second.total) {
					return first.total - second.total;
				}
				if (first.cleanup !== second.cleanup) {
					return first.cleanup - second.cleanup;
				}
				return first.building.name.localeCompare(second.building.name);
			});
	}, [
		buildingActions,
		buildingLookup,
		costMap,
		actionCostResource,
		player.buildings,
		player.buildings.size,
		sessionView.actions,
	]);
	if (entries.length === 0) {
		return subtitle ? (
			<p className={CATEGORY_SUBTITLE_CLASSES}>{subtitle}</p>
		) : null;
	}
	return (
		<div className="space-y-3">
			{subtitle ? (
				<p className={CATEGORY_SUBTITLE_CLASSES}>{subtitle}</p>
			) : null}
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
			>
				{entries.map(({ action, actionInfo, building, costs, upkeep }) => {
					const focus = normalizeActionFocus(building.focus);
					const icon = building.icon ?? action.icon;
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
					const actionHoverTitle = formatIconTitle(
						actionInfo?.icon ?? action.icon,
						actionInfo?.name ?? action.name,
					);
					return (
						<ActionCard
							key={action.id}
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
								});
							}}
							onMouseEnter={() => {
								const full = descriptions.get(building.id) ?? [];
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: actionHoverTitle,
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
