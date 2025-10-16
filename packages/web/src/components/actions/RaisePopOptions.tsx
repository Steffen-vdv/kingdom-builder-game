import React, { useCallback, useMemo } from 'react';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useActionMetadata } from '../../state/useActionMetadata';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import {
	usePopulationMetadata,
	useRegistryMetadata,
} from '../../contexts/RegistryMetadataContext';
import type { RegistryMetadataDescriptor } from '../../contexts/RegistryMetadataContext';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	type ResourceDescriptorSelector,
} from './utils';
import {
	buildRequirementIconsForRole,
	determineRaisePopRoles,
	type PopulationRegistryLike,
	type PopulationDescriptorSelector,
	type PopulationDefinition,
} from './populationHelpers';
import { toPerformableAction, type Action, type DisplayPlayer } from './types';
import { normalizeActionFocus } from './types';
import { formatIconTitle, renderIconLabel } from './iconHelpers';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

export default function RaisePopOptions({
	action,
	player,
	canInteract,
	selectResourceDescriptor,
}: {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}) {
	const {
		sessionView,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { costs: costBag, requirements: requirementFailures } =
		useActionMetadata(action.id);
	const { populations } = useRegistryMetadata();
	const populationMetadata = usePopulationMetadata();
	const selectPopulationDescriptor = useCallback<PopulationDescriptorSelector>(
		(roleId) => populationMetadata.select(roleId),
		[populationMetadata],
	);
	const defaultPopulationIcon = useMemo(() => {
		return populationMetadata.list.find((entry) => entry.icon)?.icon;
	}, [populationMetadata]);
	const populationRegistry = useMemo<PopulationRegistryLike>(() => {
		const entries: Array<[string, PopulationDefinition]> = populations
			.entries()
			.map(([id, definition]) => [id, definition]);
		return {
			get(id: string) {
				const definition = populations.get(id);
				if (!definition) {
					throw new Error(`Unknown population: ${id}`);
				}
				return definition;
			},
			entries() {
				return entries;
			},
		};
	}, [populations]);
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
	const resolvePopulationDescriptor = useCallback(
		(role: string) => {
			try {
				return selectPopulationDescriptor(role);
			} catch {
				let name: string | undefined;
				let icon: string | undefined;
				try {
					const definition = populationRegistry.get(role);
					name = definition?.name ?? role;
					icon = definition?.icon;
				} catch {
					name = role;
				}
				const descriptor: RegistryMetadataDescriptor = {
					id: role,
					label: name ?? role,
				};
				const resolvedIcon = icon ?? defaultPopulationIcon;
				if (resolvedIcon) {
					descriptor.icon = resolvedIcon;
				}
				return descriptor;
			}
		},
		[selectPopulationDescriptor, populationRegistry, defaultPopulationIcon],
	);
	const getRequirementIconsForRole = useCallback(
		(role: string) =>
			buildRequirementIconsForRole(
				actionDefinition,
				role,
				baseRequirementIcons,
				populationRegistry,
				selectPopulationDescriptor,
				defaultPopulationIcon,
			),
		[
			actionDefinition,
			baseRequirementIcons,
			populationRegistry,
			selectPopulationDescriptor,
			defaultPopulationIcon,
		],
	);
	const actionInfo = sessionView.actions.get(action.id);
	const actionFocus = normalizeActionFocus(actionInfo?.focus ?? action.focus);
	return (
		<>
			{roleOptions.map((role) => {
				const costEntries = Object.entries(costBag);
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
				const requirements = requirementFailures.map((failure) =>
					translateRequirementFailure(failure, translationContext),
				);
				const canPay = playerHasRequiredResources(player.resources, costs);
				const meetsReq = requirements.length === 0;
				const enabled = canPay && meetsReq && canInteract;
				const requirementIcons = getRequirementIconsForRole(role);
				const insufficientTooltip = formatMissingResources(
					costs,
					player.resources,
					selectResourceDescriptor,
				);
				const actionIcon = actionInfo?.icon;
				const actionName = actionInfo?.name ?? action.name;
				const roleDescriptor = resolvePopulationDescriptor(role);
				const roleIcon = roleDescriptor.icon ?? defaultPopulationIcon ?? '';
				const roleLabel = roleDescriptor.label;
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
				const actionLabelNode = renderIconLabel(actionIcon, actionName);
				const roleLabelNode = renderIconLabel(roleIcon, roleLabel);
				const hoverTitle = `${formatIconTitle(
					actionIcon,
					actionName,
				)}: ${formatIconTitle(roleIcon, roleLabel)}`;
				return (
					<ActionCard
						key={role}
						title={
							<>
								{actionLabelNode}: {roleLabelNode}
							</>
						}
						costs={costs}
						upkeep={upkeep}
						playerResources={player.resources}
						actionCostResource={actionCostResource}
						requirements={requirements}
						requirementIcons={requirementIcons}
						summary={shortSummary}
						assets={translationContext.assets}
						enabled={enabled}
						tooltip={title}
						focus={actionFocus}
						onClick={() => {
							if (!canInteract) {
								return;
							}
							void handlePerform(toPerformableAction(action), { role });
						}}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: hoverTitle,
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
