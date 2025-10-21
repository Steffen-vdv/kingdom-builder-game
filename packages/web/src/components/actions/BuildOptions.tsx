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
	splitActionCostMap,
	sumNonActionCosts,
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
import { useActionOptionCosts } from './useActionOptionCosts';
import { CATEGORY_SUBTITLE_CLASSES } from './actionsPanelStyles';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface BuildOptionEntry {
	action: Action;
	building: Building;
	costs: Record<string, number>;
	upkeep: Record<string, number>;
	summary: Summary | undefined;
	description: Summary | undefined;
	implemented: boolean;
}

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

interface BuildActionCardEntryProps {
	entry: BuildOptionEntry;
	isActionPhase: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	actionCostResource: string;
	handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
	clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
	requests: ReturnType<typeof useGameEngine>['requests'];
	translationContext: ReturnType<typeof useGameEngine>['translationContext'];
}

function normalizeCostRecord(
	record: Record<string, number | undefined> | undefined,
): Record<string, number> {
	if (!record) {
		return {};
	}
	const normalized: Record<string, number> = {};
	for (const [key, value] of Object.entries(record)) {
		const amount = Number(value ?? 0);
		if (!Number.isFinite(amount)) {
			continue;
		}
		normalized[key] = amount;
	}
	return normalized;
}

function mergeCosts(
	base: Record<string, number>,
	overrides: Record<string, number>,
): Record<string, number> {
	const merged: Record<string, number> = { ...base };
	for (const [key, amount] of Object.entries(overrides)) {
		merged[key] = amount;
	}
	return merged;
}

function mergeUpkeep(
	base: Record<string, number>,
	cleanup: Record<string, number>,
): Record<string, number> {
	const merged: Record<string, number> = { ...base };
	for (const [key, amount] of Object.entries(cleanup)) {
		merged[key] = amount;
	}
	return merged;
}

function BuildActionCardEntry({
	entry,
	isActionPhase,
	player,
	canInteract,
	selectResourceDescriptor,
	actionCostResource,
	handleHoverCard,
	clearHoverCard,
	requests,
	translationContext,
}: BuildActionCardEntryProps) {
	const { action, building, costs, upkeep, summary, description, implemented } =
		entry;
	const metadata = useActionMetadata({ actionId: action.id });
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
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
	const canPay = playerHasRequiredResources(player.resources, costs);
	const insufficientTooltip = formatMissingResources(
		costs,
		player.resources,
		selectResourceDescriptor,
	);
	const requirementText = requirementMessages.join(', ');
	const loadingRequirements = !requirementsAvailable && requirementsLoading;
	const hoverTitle = formatIconTitle(action.icon ?? building.icon, action.name);
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
	const onClick = () => {
		if (!canInteract) {
			return;
		}
		void requests.performAction({ action: toPerformableAction(action) });
	};
	const onMouseEnter = () => {
		const full = description ?? [];
		const { effects, description: hoverDescription } = splitSummary(full);
		handleHoverCard({
			title: hoverTitle,
			effects,
			requirements: requirementMessages,
			costs,
			upkeep,
			...(hoverDescription && { description: hoverDescription }),
			...(!implemented && {
				description: 'Not implemented yet',
				descriptionClass: 'italic text-red-600',
			}),
			bgClass: HOVER_CARD_BG,
		});
	};
	const onMouseLeave = () => {
		clearHoverCard();
	};
	const titleLabel = renderIconLabel(
		building.icon ?? action.icon,
		building.name ?? action.name,
	);
	return (
		<ActionCard
			key={action.id}
			title={titleLabel}
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
			focus={action.focus}
			assets={translationContext.assets}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		/>
	);
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
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { subtitle } = category;
	const buildingMap = useMemo(() => {
		const map = new Map<string, Building>();
		buildings.forEach((building) => map.set(building.id, building));
		return map;
	}, [buildings]);
	const costRequests = useMemo(
		() =>
			actions.map((action) => ({
				key: action.id,
				actionId: action.id,
			})),
		[actions],
	);
	const costMap = useActionOptionCosts(costRequests);
	const entries = useMemo<BuildOptionEntry[]>(() => {
		const owned = player.buildings;
		const items: Array<
			BuildOptionEntry & { totalCost: number; totalUpkeep: number }
		> = [];
		actions.forEach((action) => {
			const buildingId = action.buildingId;
			if (!buildingId) {
				return;
			}
			const building = buildingMap.get(buildingId);
			if (!building) {
				return;
			}
			if (owned.has(buildingId)) {
				return;
			}
			const metadataCosts = costMap.get(action.id);
			const { costs: dynamicCosts, cleanup: dynamicCleanup } =
				splitActionCostMap(metadataCosts);
			const baseCosts = normalizeCostRecord(action.baseCosts);
			const mergedCosts = mergeCosts(baseCosts, dynamicCosts);
			const baseUpkeep = normalizeCostRecord(action.upkeep);
			const mergedUpkeep = mergeUpkeep(baseUpkeep, dynamicCleanup);
			const totalCost = sumNonActionCosts(mergedCosts, actionCostResource);
			const totalUpkeep = sumUpkeep(mergedUpkeep);
			const summary = summaries.get(building.id);
			const description = descriptions.get(building.id);
			const implemented = (summary?.length ?? 0) > 0;
			items.push({
				action,
				building,
				costs: mergedCosts,
				upkeep: mergedUpkeep,
				summary,
				description,
				implemented,
				totalCost,
				totalUpkeep,
			});
		});
		return items
			.sort((left, right) => {
				if (left.totalCost !== right.totalCost) {
					return left.totalCost - right.totalCost;
				}
				if (left.totalUpkeep !== right.totalUpkeep) {
					return left.totalUpkeep - right.totalUpkeep;
				}
				return left.building.name.localeCompare(right.building.name);
			})
			.map(
				({ totalCost: _totalCost, totalUpkeep: _totalUpkeep, ...rest }) => rest,
			);
	}, [
		actions,
		actionCostResource,
		buildingMap,
		costMap,
		descriptions,
		player.buildings,
		summaries,
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
				{entries.map((entry) => (
					<BuildActionCardEntry
						key={entry.action.id}
						entry={entry}
						isActionPhase={isActionPhase}
						player={player}
						canInteract={canInteract}
						selectResourceDescriptor={selectResourceDescriptor}
						actionCostResource={actionCostResource}
						handleHoverCard={handleHoverCard}
						clearHoverCard={clearHoverCard}
						requests={requests}
						translationContext={translationContext}
					/>
				))}
			</div>
		</div>
	);
}
