import React, { useMemo } from 'react';
import {
	splitSummary,
	translateRequirementFailure,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
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
import {
	useActionOptionCosts,
	type ActionCostRequest,
} from './useActionOptionCosts';
import { CATEGORY_SUBTITLE_CLASSES } from './actionsPanelStyles';
import { buildingIdFromAction, type ActionId } from '@kingdom-builder/contents';
import type { ActionAvailabilityResult } from './getActionAvailability';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

const assignFiniteNumbers = (
	target: Record<string, number>,
	source: Record<string, number | undefined> | undefined,
) => {
	if (!source) {
		return;
	}
	for (const key of Object.keys(source)) {
		const value = source[key];
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			continue;
		}
		target[key] = value;
	}
};

type BuildActionEntry = {
	action: Action;
	building: Building;
	buildingId: string;
};

type BuildCardEntry = {
	action: Action;
	building: Building;
	buildingId: string;
	costs: Record<string, number>;
	upkeep: Record<string, number>;
	total: number;
	cleanupTotal: number;
	requirementDisplay: string[];
	requirementIcons: string[];
	requirementMessages: string[];
	requirementsLoading: boolean;
	meetsRequirements: boolean;
	canPay: boolean;
	implemented: boolean;
	title?: string;
	hoverTitle: string;
};

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
	availability: Map<string, ActionAvailabilityResult>;
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
	availability,
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
	const buildingsById = useMemo(() => {
		const map = new Map<string, Building>();
		for (const building of buildings) {
			map.set(building.id, building);
		}
		return map;
	}, [buildings]);
	const buildEntries = useMemo<BuildActionEntry[]>(() => {
		const entries: BuildActionEntry[] = [];
		for (const action of actions) {
			const buildingId = buildingIdFromAction(action.id as ActionId);
			if (!buildingId) {
				continue;
			}
			const building = buildingsById.get(buildingId);
			if (!building) {
				continue;
			}
			if (player.buildings.has(buildingId)) {
				continue;
			}
			entries.push({ action, building, buildingId });
		}
		return entries;
	}, [actions, buildingsById, player.buildings]);
	const costRequests = useMemo<ActionCostRequest[]>(() => {
		const requests: ActionCostRequest[] = [];
		for (const { buildingId, action } of buildEntries) {
			requests.push({ key: buildingId, actionId: action.id });
		}
		return requests;
	}, [buildEntries]);
	const costMap = useActionOptionCosts(costRequests);
	const { subtitle } = category;
	const entries = useMemo<BuildCardEntry[]>(() => {
		const list: BuildCardEntry[] = [];
		for (const { action, building, buildingId } of buildEntries) {
			const metadataCosts = costMap.get(buildingId);
			const { costs: dynamicCosts, cleanup: dynamicCleanup } =
				splitActionCostMap(metadataCosts);
			const costs: Record<string, number> = {};
			assignFiniteNumbers(costs, building.costs);
			assignFiniteNumbers(costs, action.baseCosts);
			assignFiniteNumbers(costs, dynamicCosts);
			const combinedUpkeep: Record<string, number> = {};
			assignFiniteNumbers(combinedUpkeep, building.upkeep);
			assignFiniteNumbers(combinedUpkeep, dynamicCleanup);
			const availabilityState = availability.get(action.id);
			const requirementFailures = availabilityState?.requirementFailures ?? [];
			const requirementMessages = requirementFailures.map((failure) =>
				translateRequirementFailure(failure, translationContext),
			);
			const requirementsReady = availabilityState?.requirementsReady ?? false;
			const requirementsLoading = availabilityState ? !requirementsReady : true;
			const requirementDisplay =
				requirementMessages.length > 0
					? requirementMessages
					: requirementsLoading
						? ['Loading requirements…']
						: [];
			const meetsRequirements = requirementsReady
				? availabilityState?.meetsRequirements === true
				: false;
			const costsReady = availabilityState?.costsReady ?? false;
			const canPay = costsReady
				? availabilityState?.canPay === true
				: playerHasRequiredResources(player.resources, costs);
			const requirementIcons = getRequirementIcons(
				action.id,
				translationContext,
			);
			const summary = summaries.get(buildingId);
			const implemented = (summary?.length ?? 0) > 0;
			const insufficientTooltip = formatMissingResources(
				costs,
				player.resources,
				selectResourceDescriptor,
			);
			const cannotPayMessage = insufficientTooltip ?? 'Cannot pay costs';
			let title: string | undefined;
			if (!implemented) {
				title = 'Not implemented yet';
			} else if (requirementsLoading) {
				title = 'Loading requirements…';
			} else if (!meetsRequirements) {
				title = requirementMessages.join(', ');
			} else if (!canPay) {
				title = cannotPayMessage;
			}
			const actionDefinition = sessionView.actions.get(action.id);
			const actionHoverTitle = formatIconTitle(
				actionDefinition?.icon ?? action.icon,
				actionDefinition?.name ?? action.name,
			);
			const hoverTitleParts = [
				actionHoverTitle,
				formatIconTitle(building.icon, building.name),
			].filter(Boolean);
			const hoverTitle = hoverTitleParts.join(' - ');
			const total = sumNonActionCosts(costs, actionCostResource);
			const cleanupTotal = sumUpkeep(combinedUpkeep);
			const entry: BuildCardEntry = {
				action,
				building,
				buildingId,
				costs,
				upkeep: combinedUpkeep,
				total,
				cleanupTotal,
				requirementDisplay,
				requirementIcons,
				requirementMessages,
				requirementsLoading,
				meetsRequirements,
				canPay,
				implemented,
				hoverTitle,
				...(title === undefined ? {} : { title }),
			};
			list.push(entry);
		}
		return list.sort((first, second) => {
			if (first.total !== second.total) {
				return first.total - second.total;
			}
			if (first.cleanupTotal !== second.cleanupTotal) {
				return first.cleanupTotal - second.cleanupTotal;
			}
			return first.building.name.localeCompare(second.building.name);
		});
	}, [
		buildEntries,
		costMap,
		availability,
		translationContext,
		player.resources,
		actionCostResource,
		selectResourceDescriptor,
		summaries,
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
				{entries.map(
					({
						action,
						building,
						buildingId,
						costs,
						upkeep,
						requirementDisplay,
						requirementIcons,
						requirementMessages,
						requirementsLoading,
						meetsRequirements,
						canPay,
						implemented,
						title,
						hoverTitle,
					}) => {
						const focus = normalizeActionFocus(building.focus);
						const summary = summaries.get(buildingId);
						const enabled =
							canPay &&
							meetsRequirements &&
							isActionPhase &&
							canInteract &&
							implemented &&
							!requirementsLoading;
						return (
							<ActionCard
								key={buildingId}
								title={renderIconLabel(building.icon, building.name)}
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
									const full = descriptions.get(buildingId) ?? [];
									const { effects, description } = splitSummary(full);
									handleHoverCard({
										title: hoverTitle,
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
					},
				)}
			</div>
		</div>
	);
}
