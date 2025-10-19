import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	splitSummary,
	translateRequirementFailure,
	type Summary,
	type TranslationContext,
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
	type ResourceDescriptorSelector,
} from './utils';
import { formatIconTitle, renderIconLabel } from './iconHelpers';
import {
	toPerformableAction,
	type Action,
	type Building,
	type DisplayPlayer,
	type GameEngineApi,
} from './types';
import { normalizeActionFocus } from './types';

type TranslationAssets = TranslationContext['assets'];

const EMPTY_COSTS: Record<string, number> = {};

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

interface BuildOptionCardProps {
	action: Action;
	building: Building;
	summaries: Map<string, Summary>;
	descriptions: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	isActionPhase: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	actionCostResource: string;
	requirementIcons: string[];
	requirements: string[];
	requirementsLoaded: boolean;
	meetsRequirements: boolean;
	actionHoverTitle: string;
	handleHoverCard: GameEngineApi['handleHoverCard'];
	clearHoverCard: GameEngineApi['clearHoverCard'];
	requests: GameEngineApi['requests'];
	onTotalChange: (buildingId: string, total: number | null) => void;
	assets: TranslationAssets;
}

function normalizeCosts(
	costs: Record<string, number | undefined> | undefined,
): Record<string, number> | undefined {
	if (!costs) {
		return undefined;
	}
	const normalized: Record<string, number> = {};
	for (const [costKey, costAmount] of Object.entries(costs)) {
		normalized[costKey] = Number(costAmount ?? 0);
	}
	return normalized;
}

function BuildOptionCard({
	action,
	building,
	summaries,
	descriptions,
	player,
	canInteract,
	isActionPhase,
	selectResourceDescriptor,
	actionCostResource,
	requirementIcons,
	requirements,
	requirementsLoaded,
	meetsRequirements,
	actionHoverTitle,
	handleHoverCard,
	clearHoverCard,
	requests,
	onTotalChange,
	assets,
}: BuildOptionCardProps) {
	const metadataParams = useMemo(() => ({ id: building.id }), [building.id]);
	const metadata = useActionMetadata({
		actionId: action.id,
		params: metadataParams,
	});
	const normalizedCosts = useMemo(
		() => normalizeCosts(metadata.costs),
		[metadata.costs],
	);
	const costs = normalizedCosts ?? EMPTY_COSTS;
	const total = useMemo(() => {
		if (!normalizedCosts) {
			return null;
		}
		return sumNonActionCosts(normalizedCosts, actionCostResource);
	}, [normalizedCosts, actionCostResource]);
	useEffect(() => {
		onTotalChange(building.id, total);
	}, [building.id, total, onTotalChange]);
	const summary = summaries.get(building.id);
	const implemented = (summary?.length ?? 0) > 0;
	const focus = normalizeActionFocus(building.focus);
	const loadingCosts = metadata.costs === undefined;
	const canPay =
		!loadingCosts && playerHasRequiredResources(player.resources, costs);
	const insufficientTooltip = !loadingCosts
		? formatMissingResources(costs, player.resources, selectResourceDescriptor)
		: undefined;
	const requirementSummary = requirements.join(', ');
	let tooltip: string | undefined;
	if (!implemented) {
		tooltip = 'Not implemented yet';
	} else if (!requirementsLoaded) {
		tooltip = 'Checking requirements…';
	} else if (!meetsRequirements) {
		tooltip =
			requirementSummary.length > 0
				? requirementSummary
				: 'Requirements not met';
	} else if (loadingCosts) {
		tooltip = 'Checking costs…';
	} else if (!canPay) {
		tooltip = insufficientTooltip ?? 'Cannot pay costs';
	}
	const enabled =
		!loadingCosts &&
		canPay &&
		meetsRequirements &&
		isActionPhase &&
		canInteract &&
		implemented;
	const hoverTitle = [
		actionHoverTitle,
		formatIconTitle(building.icon, building.name),
	]
		.filter(Boolean)
		.join(' - ');
	const upkeep = building.upkeep;
	const visibleRequirements = requirementsLoaded ? requirements : [];
	return (
		<ActionCard
			key={building.id}
			title={renderIconLabel(building.icon, building.name)}
			costs={costs}
			upkeep={upkeep}
			playerResources={player.resources}
			actionCostResource={actionCostResource}
			requirements={visibleRequirements}
			requirementIcons={requirementIcons}
			summary={summary}
			implemented={implemented}
			enabled={enabled}
			tooltip={tooltip}
			focus={focus}
			assets={assets}
			onClick={() => {
				if (!canInteract || !enabled) {
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
					requirements: visibleRequirements,
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
	const actionMetadata = useActionMetadata({ actionId: action.id });
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
	const requirements = useMemo(() => {
		if (!actionMetadata.requirements) {
			return [];
		}
		return actionMetadata.requirements.map((failure) =>
			translateRequirementFailure(failure, translationContext),
		);
	}, [actionMetadata.requirements, translationContext]);
	const requirementsLoaded = actionMetadata.requirements !== undefined;
	const meetsRequirements = requirementsLoaded && requirements.length === 0;
	const availableBuildings = useMemo(
		() => buildings.filter((building) => !player.buildings.has(building.id)),
		[buildings, player.buildings],
	);
	const [buildingTotals, setBuildingTotals] = useState<
		Record<string, number | null>
	>({});
	const handleTotalChange = useCallback(
		(buildingId: string, total: number | null) => {
			setBuildingTotals((previous) => {
				if (previous[buildingId] === total) {
					return previous;
				}
				return { ...previous, [buildingId]: total };
			});
		},
		[],
	);
	const sortedBuildings = useMemo(() => {
		return availableBuildings
			.map((building) => ({
				building,
				total: buildingTotals[building.id],
			}))
			.sort((first, second) => {
				const firstValue = first.total ?? Number.POSITIVE_INFINITY;
				const secondValue = second.total ?? Number.POSITIVE_INFINITY;
				if (firstValue !== secondValue) {
					return firstValue - secondValue;
				}
				return first.building.name.localeCompare(second.building.name);
			})
			.map((entry) => entry.building);
	}, [availableBuildings, buildingTotals]);
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
					(Effects take place on build and last until building is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{sortedBuildings.map((building) => (
					<BuildOptionCard
						key={building.id}
						action={action}
						building={building}
						summaries={summaries}
						descriptions={descriptions}
						player={player}
						canInteract={canInteract}
						isActionPhase={isActionPhase}
						selectResourceDescriptor={selectResourceDescriptor}
						actionCostResource={actionCostResource}
						requirementIcons={requirementIcons}
						requirements={requirements}
						requirementsLoaded={requirementsLoaded}
						meetsRequirements={meetsRequirements}
						actionHoverTitle={actionHoverTitle}
						handleHoverCard={handleHoverCard}
						clearHoverCard={clearHoverCard}
						requests={requests}
						onTotalChange={handleTotalChange}
						assets={translationContext.assets}
					/>
				))}
			</div>
		</div>
	);
}
