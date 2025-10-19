import React, { useCallback, useMemo } from 'react';
import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol/session';
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
		selectors,
		translationContext,
		requests,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const { getActionRequirements, performAction } = requests;
	const { sessionView } = selectors;
	const { populations } = useRegistryMetadata();
	const populationMetadata = usePopulationMetadata();
	const metadata = useActionMetadata({ actionId: action.id });
	const selectPopulationDescriptor = useCallback<PopulationDescriptorSelector>(
		(roleId) => populationMetadata.select(roleId),
		[populationMetadata],
	);
	const defaultPopulationIcon = useMemo(() => {
		const fallback = populationMetadata.list.find((entry) => entry.icon)?.icon;
		const assetIcon = translationContext.assets.population?.icon;
		return assetIcon ?? fallback;
	}, [populationMetadata, translationContext.assets.population]);
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
	const costs = useMemo(() => {
		const entries = Object.entries(metadata.costs ?? {});
		return Object.fromEntries(
			entries.map(([resourceKey, amount]) => [resourceKey, amount ?? 0]),
		) as Record<string, number>;
	}, [metadata.costs]);
	const costsReady = metadata.costs !== undefined;
	const fallbackRequirementFailures = useMemo<SessionActionRequirementList>(
		() => getActionRequirements(action.id),
		[getActionRequirements, action.id],
	);
	const requirementFailures =
		metadata.requirements ?? fallbackRequirementFailures;
	const populationCap = player.stats?.maxPopulation;
	const totalPopulation = useMemo(
		() =>
			Object.values(player.population ?? {}).reduce(
				(sum, count) => sum + (count ?? 0),
				0,
			),
		[player.population],
	);
	const derivedRequirementFailure = useMemo(() => {
		if (typeof populationCap !== 'number' || totalPopulation < populationCap) {
			return null;
		}
		const failure: SessionRequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					operator: 'lt',
					left: { type: 'population' },
					right: { type: 'stat', params: { key: 'maxPopulation' } },
				},
			},
			details: { left: totalPopulation, right: populationCap },
		};
		return failure;
	}, [populationCap, totalPopulation]);
	const effectiveRequirementFailures =
		derivedRequirementFailure && requirementFailures.length === 0
			? [derivedRequirementFailure]
			: requirementFailures;
	const requirementsReady =
		metadata.requirements !== undefined || derivedRequirementFailure !== null;
	const requirementMessages = requirementsReady
		? effectiveRequirementFailures.map((failure) =>
				translateRequirementFailure(failure, translationContext),
			)
		: ['Loading requirements…'];
	return (
		<>
			{roleOptions.map((role) => {
				let upkeep: Record<string, number> | undefined;
				try {
					upkeep = populationRegistry.get(role)?.upkeep;
				} catch {
					upkeep = undefined;
				}
				const canPay = costsReady
					? playerHasRequiredResources(player.resources, costs)
					: false;
				const meetsRequirements =
					requirementsReady && effectiveRequirementFailures.length === 0;
				const enabled =
					canInteract && costsReady && canPay && meetsRequirements;
				const requirementIcons = getRequirementIconsForRole(role);
				const insufficientTooltip = costsReady
					? formatMissingResources(
							costs,
							player.resources,
							selectResourceDescriptor,
						)
					: undefined;
				const actionIcon = actionInfo?.icon;
				const actionName = actionInfo?.name ?? action.name;
				const roleDescriptor = resolvePopulationDescriptor(role);
				const roleIcon = roleDescriptor.icon ?? defaultPopulationIcon ?? '';
				const roleLabel = roleDescriptor.label;
				const requirementText = requirementMessages.join(', ');
				const title = !requirementsReady
					? 'Loading requirements…'
					: !costsReady
						? 'Loading costs…'
						: !meetsRequirements
							? requirementText
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
						requirements={requirementMessages}
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
							void performAction({
								action: toPerformableAction(action),
								params: { role },
							});
						}}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: hoverTitle,
								effects,
								requirements: requirementMessages,
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
