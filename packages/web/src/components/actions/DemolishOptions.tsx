import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
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
import {
	toPerformableAction,
	normalizeActionFocus,
	type Action,
	type Building,
	type DisplayPlayer,
	type GameEngineApi,
} from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';

const EMPTY_COSTS: Record<string, number> = {};

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

type TranslationAssets = TranslationContext['assets'];

interface DemolishOptionsProps {
	action: Action;
	isActionPhase: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

interface DemolishOptionCardProps {
	action: Action;
	building: Building;
	player: DisplayPlayer;
	canInteract: boolean;
	isActionPhase: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	actionCostResource: string;
	requirementIcons: string[];
	translationContext: TranslationContext;
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

function DemolishOptionCard({
	action,
	building,
	player,
	canInteract,
	isActionPhase,
	selectResourceDescriptor,
	actionCostResource,
	requirementIcons,
	translationContext,
	actionHoverTitle,
	handleHoverCard,
	clearHoverCard,
	requests,
	onTotalChange,
	assets,
}: DemolishOptionCardProps) {
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
	const summary = summarizeContent(
		'building',
		building.id,
		translationContext,
		{
			installed: true,
		},
	);
	const implemented = (summary?.length ?? 0) > 0;
	const focus = normalizeActionFocus(building.focus);
	const loadingCosts = metadata.costs === undefined;
	const canPay =
		!loadingCosts && playerHasRequiredResources(player.resources, costs);
	const insufficientTooltip = !loadingCosts
		? formatMissingResources(costs, player.resources, selectResourceDescriptor)
		: undefined;
	const requirements = useMemo(() => {
		if (!metadata.requirements) {
			return undefined;
		}
		return metadata.requirements.map((failure) =>
			translateRequirementFailure(failure, translationContext),
		);
	}, [metadata.requirements, translationContext]);
	const requirementsLoaded = requirements !== undefined;
	const visibleRequirements = requirementsLoaded ? (requirements ?? []) : [];
	const meetsRequirements =
		requirementsLoaded && (requirements?.length ?? 0) === 0;
	let tooltip: string | undefined;
	if (!implemented) {
		tooltip = 'Not implemented yet';
	} else if (!requirementsLoaded) {
		tooltip = 'Checking requirements…';
	} else if (!meetsRequirements) {
		const requirementSummary = visibleRequirements.join(', ');
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
	return (
		<ActionCard
			key={building.id}
			title={renderIconLabel(building.icon, building.name)}
			costs={costs}
			upkeep={building.upkeep}
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
				const full = describeContent(
					'building',
					building.id,
					translationContext,
					{
						installed: true,
					},
				);
				const { effects, description } = splitSummary(full);
				handleHoverCard({
					title: hoverTitle,
					effects,
					requirements: visibleRequirements,
					costs,
					upkeep: building.upkeep,
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
	const installedBuildings = useMemo(() => {
		return Array.from(player.buildings)
			.map((buildingId) => sessionView.buildings.get(buildingId))
			.filter((entry): entry is Building => Boolean(entry));
	}, [player.buildings, sessionView.buildings]);
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
		return installedBuildings
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
	}, [installedBuildings, buildingTotals]);
	if (sortedBuildings.length === 0) {
		return null;
	}
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
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
				{sortedBuildings.map((building) => (
					<DemolishOptionCard
						key={building.id}
						action={action}
						building={building}
						player={player}
						canInteract={canInteract}
						isActionPhase={isActionPhase}
						selectResourceDescriptor={selectResourceDescriptor}
						actionCostResource={actionCostResource}
						requirementIcons={requirementIcons}
						translationContext={translationContext}
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
