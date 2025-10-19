import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	describeContent,
	splitSummary,
	type Summary,
	type TranslationContext,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useActionMetadata } from '../../state/useActionMetadata';
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
	type GameEngineApi,
} from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';

const EMPTY_COSTS: Record<string, number> = {};

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

type TranslationAssets = TranslationContext['assets'];

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

interface DevelopOptionCardProps {
	action: Action;
	development: Development;
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	isActionPhase: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	actionCostResource: string;
	translationContext: TranslationContext;
	developLandRequirement: string;
	missingLandTooltip: string;
	hasDevelopLand: boolean;
	actionHoverTitle: string;
	handleHoverCard: GameEngineApi['handleHoverCard'];
	clearHoverCard: GameEngineApi['clearHoverCard'];
	requests: GameEngineApi['requests'];
	onTotalChange: (developmentId: string, total: number | null) => void;
	landIdForCost?: string;
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

function createMetadataParams(
	developmentId: string,
	landIdForCost: string | undefined,
): { id: string; landId?: string } {
	if (!landIdForCost) {
		return { id: developmentId };
	}
	return { id: developmentId, landId: landIdForCost };
}

function DevelopOptionCard({
	action,
	development,
	summaries,
	player,
	canInteract,
	isActionPhase,
	selectResourceDescriptor,
	actionCostResource,
	translationContext,
	developLandRequirement,
	missingLandTooltip,
	hasDevelopLand,
	actionHoverTitle,
	handleHoverCard,
	clearHoverCard,
	requests,
	onTotalChange,
	landIdForCost,
	assets,
}: DevelopOptionCardProps) {
	const metadataParams = useMemo(
		() => createMetadataParams(development.id, landIdForCost),
		[development.id, landIdForCost],
	);
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
		onTotalChange(development.id, total);
	}, [development.id, total, onTotalChange]);
	const summary = summaries.get(development.id);
	const implemented = (summary?.length ?? 0) > 0;
	const loadingCosts = metadata.costs === undefined;
	const canPay =
		hasDevelopLand &&
		!loadingCosts &&
		playerHasRequiredResources(player.resources, costs);
	const insufficientTooltip = !loadingCosts
		? formatMissingResources(costs, player.resources, selectResourceDescriptor)
		: undefined;
	const requirements = hasDevelopLand ? [] : [developLandRequirement];
	let tooltip: string | undefined;
	if (!implemented) {
		tooltip = 'Not implemented yet';
	} else if (!hasDevelopLand) {
		tooltip = missingLandTooltip;
	} else if (loadingCosts) {
		tooltip = 'Checking costs…';
	} else if (!canPay) {
		tooltip = insufficientTooltip ?? 'Cannot pay costs';
	}
	const enabled =
		hasDevelopLand &&
		!loadingCosts &&
		canPay &&
		isActionPhase &&
		canInteract &&
		implemented;
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
			upkeep={development.upkeep}
			playerResources={player.resources}
			actionCostResource={actionCostResource}
			requirements={requirements}
			requirementIcons={[]}
			summary={summary}
			implemented={implemented}
			enabled={enabled}
			tooltip={tooltip}
			focus={development.focus}
			assets={assets}
			onClick={() => {
				if (!canInteract || !enabled) {
					return;
				}
				const landId = player.lands.find((land) => land.slotsFree > 0)?.id;
				void requests.performAction({
					action: toPerformableAction(action),
					params: { id: development.id, landId },
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
					upkeep: development.upkeep,
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
	const developLandRequirement = useMemo(
		() =>
			formatLandRequirement(
				'Requires',
				slotDescriptor.label,
				slotDescriptor.icon,
			),
		[slotDescriptor],
	);
	const missingLandTooltip = useMemo(
		() =>
			formatLandRequirement('No', slotDescriptor.label, slotDescriptor.icon),
		[slotDescriptor],
	);
	const landIdForCost = player.lands[0]?.id;
	const [developmentTotals, setDevelopmentTotals] = useState<
		Record<string, number | null>
	>({});
	const handleTotalChange = useCallback(
		(developmentId: string, total: number | null) => {
			setDevelopmentTotals((previous) => {
				if (previous[developmentId] === total) {
					return previous;
				}
				return { ...previous, [developmentId]: total };
			});
		},
		[],
	);
	const sortedDevelopments = useMemo(() => {
		return developments
			.map((development) => ({
				development,
				total: developmentTotals[development.id],
			}))
			.sort((first, second) => {
				const firstValue = first.total ?? Number.POSITIVE_INFINITY;
				const secondValue = second.total ?? Number.POSITIVE_INFINITY;
				if (firstValue !== secondValue) {
					return firstValue - secondValue;
				}
				return first.development.name.localeCompare(second.development.name);
			})
			.map((entry) => entry.development);
	}, [developments, developmentTotals]);
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
					(Effects take place on build and last until development is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{sortedDevelopments.map((development) => (
					<DevelopOptionCard
						key={development.id}
						action={action}
						development={development}
						summaries={summaries}
						player={player}
						canInteract={canInteract}
						isActionPhase={isActionPhase}
						selectResourceDescriptor={selectResourceDescriptor}
						actionCostResource={actionCostResource}
						translationContext={translationContext}
						developLandRequirement={developLandRequirement}
						missingLandTooltip={missingLandTooltip}
						hasDevelopLand={hasDevelopLand}
						actionHoverTitle={actionHoverTitle}
						handleHoverCard={handleHoverCard}
						clearHoverCard={clearHoverCard}
						requests={requests}
						onTotalChange={handleTotalChange}
						{...(landIdForCost ? { landIdForCost } : {})}
						assets={translationContext.assets}
					/>
				))}
			</div>
		</div>
	);
}
