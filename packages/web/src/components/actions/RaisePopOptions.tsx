import React, { useCallback, useMemo } from 'react';
import { getActionCosts, getActionRequirements } from '@kingdom-builder/engine';
import {
	POPULATION_ROLES,
	type PopulationRoleId,
} from '@kingdom-builder/contents';
import {
	describeContent,
	splitSummary,
	summarizeContent,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import { formatMissingResources, playerHasRequiredResources } from './utils';
import {
	buildRequirementIconsForRole,
	determineRaisePopRoles,
	type PopulationRegistryLike,
} from './populationHelpers';
import type { Action, DisplayPlayer } from './types';

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
		ctx,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const populationRegistry = useMemo(
		() => ctx.populations as unknown as PopulationRegistryLike,
		[ctx.populations],
	);
	const actionDefinition = useMemo(
		() => ctx.actions.get(action.id) as Action | undefined,
		[ctx.actions, action.id],
	);
	const baseRequirementIcons = useMemo(
		() => getRequirementIcons(action.id, ctx),
		[action.id, ctx],
	);
	const roleOptions = useMemo(
		() => determineRaisePopRoles(actionDefinition, populationRegistry),
		[actionDefinition, populationRegistry],
	);
	const getRequirementIconsForRole = useCallback(
		(role: PopulationRoleId) =>
			buildRequirementIconsForRole(
				actionDefinition,
				role,
				baseRequirementIcons,
				populationRegistry,
			),
		[actionDefinition, baseRequirementIcons, populationRegistry],
	);
	const actionInfo = ctx.actions.get(action.id);
	return (
		<>
			{roleOptions.map((role) => {
				const costsBag = getActionCosts(action.id, ctx);
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
				const rawRequirements = getActionRequirements(action.id, ctx);
				const requirements = rawRequirements.map((item) => `${item}`);
				const canPay = playerHasRequiredResources(player.resources, costs);
				const meetsReq = requirements.length === 0;
				const enabled = canPay && meetsReq && canInteract;
				const requirementIcons = getRequirementIconsForRole(role);
				const insufficientTooltip = formatMissingResources(
					costs,
					player.resources,
				);
				const actionIcon = actionInfo?.icon ?? '';
				const actionName = actionInfo?.name ?? '';
				const roleIcon = POPULATION_ROLES[role]?.icon ?? '';
				const roleLabel = POPULATION_ROLES[role]?.label ?? '';
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
						focus={(actionInfo as Action | undefined)?.focus}
						onClick={() => {
							if (!canInteract) {
								return;
							}
							void handlePerform(action, { role });
						}}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: `${actionIcon}${roleIcon} ${actionName}: ${roleLabel}`,
								effects,
								requirements,
								costs,
								upkeep,
								...(description && { description }),
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
