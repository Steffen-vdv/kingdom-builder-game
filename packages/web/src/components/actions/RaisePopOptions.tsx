import React, { useCallback, useMemo } from 'react';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import { formatMissingResources, playerHasRequiredResources } from './utils';
import {
	buildRequirementIconsForRole,
	createPopulationRegistry,
	determineRaisePopRoles,
	type PopulationRegistryLike,
	type PopulationRoleId,
} from './populationHelpers';
import { toPerformableAction, type Action, type DisplayPlayer } from './types';
import {
	resolveActionDisplay,
	resolvePopulationDisplay,
	resolveResourceDisplay,
} from './actionSelectors';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

export default function RaisePopOptions({
	action,
	player,
	canInteract,
}: {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const {
		session,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const populationRegistry = useMemo<PopulationRegistryLike>(
		() => createPopulationRegistry(translationContext),
		[translationContext],
	);
	const actionDefinition = useMemo(
		() => translationContext.actions.get(action.id) as Action | undefined,
		[translationContext.actions, action.id],
	);
	const baseRequirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
	const roleOptions = useMemo(
		() => determineRaisePopRoles(actionDefinition, populationRegistry),
		[actionDefinition, populationRegistry],
	);
	const resolvePopulation = (role: string) =>
		resolvePopulationDisplay(translationContext.assets, role);
	const getRequirementIconsForRole = useCallback(
		(role: PopulationRoleId) =>
			buildRequirementIconsForRole(
				actionDefinition,
				role,
				baseRequirementIcons,
				populationRegistry,
				resolvePopulation,
			),
		[
			actionDefinition,
			baseRequirementIcons,
			populationRegistry,
			resolvePopulation,
		],
	);
	const actionDisplay = resolveActionDisplay(translationContext, action);
	const resolveResource = (resourceKey: string) =>
		resolveResourceDisplay(translationContext.assets, resourceKey);
	return (
		<>
			{roleOptions.map((role) => {
				const costsBag = session.getActionCosts(action.id);
				const costEntries = Object.entries(costsBag);
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of costEntries) {
					costs[costKey] = costAmount ?? 0;
				}
				let upkeep: Record<string, number> | undefined;
				try {
					upkeep = populationRegistry.get(role)?.upkeep;
				} catch {
					upkeep = undefined;
				}
				const rawRequirements = session.getActionRequirements(action.id);
				const requirements = rawRequirements.map((failure) =>
					translateRequirementFailure(failure, translationContext),
				);
				const canPay = playerHasRequiredResources(player.resources, costs);
				const meetsReq = requirements.length === 0;
				const enabled = canPay && meetsReq && canInteract;
				const requirementIcons = getRequirementIconsForRole(role);
				const insufficientTooltip = formatMissingResources(
					costs,
					player.resources,
					resolveResource,
				);
				const actionIcon = actionDisplay.icon ?? '';
				const actionName = actionDisplay.name ?? action.name;
				const roleDisplay = resolvePopulation(role);
				const roleIcon = roleDisplay.icon ?? '';
				const roleLabel = roleDisplay.label ?? role;
				const title = !meetsReq
					? requirements.join(', ')
					: !canPay
						? (insufficientTooltip ?? 'Cannot pay costs')
						: undefined;
				const summary = describeContent(
					'action',
					action.id,
					translationContext,
					{ role },
				);
				const shortSummary = summarizeContent(
					'action',
					action.id,
					translationContext,
					{
						role,
					},
				);
				const roleTitle = `${actionIcon}${roleIcon} ${actionName}: ${roleLabel}`;
				return (
					<ActionCard
						key={role}
						title={
							<>
								{actionIcon}
								{roleIcon} {actionName}: {roleLabel}
							</>
						}
						costs={costs}
						upkeep={upkeep}
						playerResources={player.resources}
						actionCostResource={actionCostResource}
						requirements={requirements}
						requirementIcons={requirementIcons}
						summary={shortSummary}
						enabled={enabled}
						tooltip={title}
						focus={actionDisplay.focus}
						onClick={() => {
							if (!canInteract) {
								return;
							}
							void handlePerform(toPerformableAction(action), { role });
						}}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: roleTitle,
								effects,
								requirements,
								costs,
								upkeep,
								...(description && {
									description,
								}),
								bgClass: HOVER_CARD_BG,
							});
						}}
						onMouseLeave={clearHoverCard}
					/>
				);
			})}
		</>
	);
}
