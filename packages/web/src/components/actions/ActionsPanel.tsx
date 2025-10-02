import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getActionCosts, getActionRequirements } from '@kingdom-builder/engine';
import {
	RESOURCES,
	POPULATION_ROLES,
	POPULATION_INFO,
	SLOT_INFO,
	LAND_INFO,
	type Focus,
	type ResourceKey,
	type PopulationRoleId,
} from '@kingdom-builder/contents';
import {
	describeContent,
	summarizeContent,
	splitSummary,
	type Summary,
} from '../../translation';
import ActionCard from './ActionCard';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import { useAnimate } from '../../utils/useAutoAnimate';

interface Action {
	id: string;
	name: string;
	system?: boolean;
	order?: number;
	category?: string;
	focus?: Focus;
	requirements?: unknown[];
	effects?: unknown[];
}
interface Development {
	id: string;
	name: string;
	system?: boolean;
	order?: number;
	focus?: Focus;
}
interface Building {
	id: string;
	name: string;
	icon?: string;
	focus?: Focus;
}

interface PopulationDefinition {
	id: string;
	name: string;
	icon?: string;
	upkeep?: Record<string, number>;
	onAssigned?: unknown[];
	onUnassigned?: unknown[];
	onGrowthPhase?: unknown[];
	onUpkeepPhase?: unknown[];
	onPayUpkeepStep?: unknown[];
	onGainIncomeStep?: unknown[];
	onGainAPStep?: unknown[];
}

type DisplayPlayer = ReturnType<typeof useGameEngine>['ctx']['activePlayer'];

function isResourceKey(key: string): key is ResourceKey {
	return key in RESOURCES;
}

function formatMissingResources(
	costs: Record<string, number>,
	playerResources: Record<string, number | undefined>,
) {
	const missing: string[] = [];
	for (const [key, required] of Object.entries(costs)) {
		const available = playerResources[key] ?? 0;
		const shortage = required - available;
		if (shortage <= 0) continue;
		if (isResourceKey(key)) {
			missing.push(
				`${shortage} ${RESOURCES[key].icon} ${RESOURCES[key].label}`,
			);
		} else {
			missing.push(`${shortage} ${key}`);
		}
	}

	if (missing.length === 0) return undefined;

	return `Need ${missing.join(', ')}`;
}

type EffectConfig = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
	effects?: EffectConfig[];
};

type RequirementConfig = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
};

type EvaluatorConfig = {
	type?: string;
	params?: Record<string, unknown>;
};

type PopulationRegistryLike = {
	get(id: string): PopulationDefinition;
	entries(): [string, PopulationDefinition][];
};

function isHirablePopulation(
	population: PopulationDefinition | undefined,
): boolean {
	if (!population) return false;
	if (population.upkeep && Object.keys(population.upkeep).length > 0) {
		return true;
	}
	const effectLists: (keyof PopulationDefinition)[] = [
		'onAssigned',
		'onUnassigned',
		'onGrowthPhase',
		'onUpkeepPhase',
		'onPayUpkeepStep',
		'onGainIncomeStep',
		'onGainAPStep',
	];
	return effectLists.some((key) => {
		const effects = population[key];
		return Array.isArray(effects) && effects.length > 0;
	});
}

function collectPopulationRolesFromEffects(
	effects: EffectConfig[] | undefined,
	explicitRoles: Set<string>,
): boolean {
	let usesPlaceholder = false;
	for (const effect of effects ?? []) {
		if (effect.type === 'population' && effect.method === 'add') {
			const role = effect.params?.['role'];
			if (typeof role === 'string') {
				if (role.startsWith('$')) {
					usesPlaceholder = true;
				} else {
					explicitRoles.add(role);
				}
			}
		}
		if (effect.effects?.length) {
			if (collectPopulationRolesFromEffects(effect.effects, explicitRoles)) {
				usesPlaceholder = true;
			}
		}
	}
	return usesPlaceholder;
}

function getPopulationIconFromRole(
	role: string,
	populations: PopulationRegistryLike,
): string {
	if (!role) return '';
	const infoIcon = POPULATION_ROLES[role as PopulationRoleId]?.icon;
	if (infoIcon) return infoIcon;
	try {
		const population = populations.get(role);
		if (typeof population?.icon === 'string') {
			return population.icon;
		}
	} catch {
		// Ignore missing population entries when deriving icons.
	}
	return '';
}

function getIconsFromEvaluator(
	evaluator: EvaluatorConfig | undefined,
	roleId: PopulationRoleId,
	populations: PopulationRegistryLike,
): string[] {
	if (!evaluator || evaluator.type !== 'population') return [];
	const params = evaluator.params ?? {};
	const rawRole = params['role'];
	if (typeof rawRole === 'string') {
		if (rawRole.startsWith('$')) {
			if (rawRole === '$role') {
				const icon = getPopulationIconFromRole(roleId, populations);
				return icon ? [icon] : [];
			}
			const placeholderIcon = getPopulationIconFromRole(
				rawRole.slice(1),
				populations,
			);
			return placeholderIcon ? [placeholderIcon] : [];
		}
		const icon = getPopulationIconFromRole(rawRole, populations);
		return icon ? [icon] : [];
	}
	const genericIcon = POPULATION_INFO.icon;
	return genericIcon ? [genericIcon] : [];
}

function determineRaisePopRoles(
	actionDefinition: Action | undefined,
	populations: PopulationRegistryLike,
): PopulationRoleId[] {
	const explicitRoles = new Set<string>();
	const usesPlaceholder = collectPopulationRolesFromEffects(
		(actionDefinition?.effects as EffectConfig[]) ?? [],
		explicitRoles,
	);
	const orderedRoles = new Set<string>(explicitRoles);
	if (usesPlaceholder || explicitRoles.size === 0) {
		for (const [roleId, populationDef] of populations.entries()) {
			if (!explicitRoles.has(roleId) && !isHirablePopulation(populationDef)) {
				continue;
			}
			orderedRoles.add(roleId);
		}
	}
	const result: PopulationRoleId[] = [];
	for (const roleId of orderedRoles) {
		try {
			const population = populations.get(roleId);
			if (!explicitRoles.has(roleId) && !isHirablePopulation(population)) {
				continue;
			}
			result.push(roleId as PopulationRoleId);
		} catch {
			// Skip unknown population ids.
		}
	}
	return result;
}

function buildRequirementIconsForRole(
	actionDefinition: Action | undefined,
	roleId: PopulationRoleId,
	baseIcons: string[],
	populations: PopulationRegistryLike,
): string[] {
	const icons = new Set(baseIcons);
	const requirements = actionDefinition?.requirements as
		| RequirementConfig[]
		| undefined;
	if (!requirements) {
		return Array.from(icons).filter(Boolean);
	}
	for (const requirement of requirements) {
		if (requirement.type !== 'evaluator' || requirement.method !== 'compare')
			continue;
		const params = requirement.params ?? {};
		const left = params['left'] as EvaluatorConfig | undefined;
		const right = params['right'] as EvaluatorConfig | undefined;
		for (const icon of getIconsFromEvaluator(left, roleId, populations))
			icons.add(icon);
		for (const icon of getIconsFromEvaluator(right, roleId, populations))
			icons.add(icon);
	}
	return Array.from(icons).filter(Boolean);
}

function GenericActions({
	actions,
	summaries,
	player,
	canInteract,
}: {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const {
		ctx,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const formatRequirement = (req: string) => req;
	const entries = useMemo(() => {
		return actions
			.map((action) => {
				const costsBag = getActionCosts(action.id, ctx);
				const costs: Record<string, number> = {};
				for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
				const total = Object.entries(costs).reduce(
					(sum, [k, v]) => (k === actionCostResource ? sum : sum + (v ?? 0)),
					0,
				);
				return { action, costs, total };
			})
			.sort((a, b) => a.total - b.total);
	}, [actions, ctx, actionCostResource]);
	return (
		<>
			{entries.map(({ action, costs }) => {
				const requirements = getActionRequirements(action.id, ctx).map(
					formatRequirement,
				);
				const requirementIcons = getRequirementIcons(action.id, ctx);
				const canPay = Object.entries(costs).every(
					([k, v]) => (player.resources[k] || 0) >= (v ?? 0),
				);
				const meetsReq = requirements.length === 0;
				const summary = summaries.get(action.id);
				const implemented = (summary?.length ?? 0) > 0; // TODO: implement action effects
				const enabled = canPay && meetsReq && canInteract && implemented;
				const insufficientTooltip = formatMissingResources(
					costs,
					player.resources,
				);
				const title = !implemented
					? 'Not implemented yet'
					: !meetsReq
						? requirements.join(', ')
						: !canPay
							? (insufficientTooltip ?? 'Cannot pay costs')
							: undefined;
				return (
					<ActionCard
						key={action.id}
						title={
							<>
								{ctx.actions.get(action.id)?.icon || ''} {action.name}
							</>
						}
						costs={costs}
						playerResources={player.resources}
						actionCostResource={actionCostResource}
						requirements={requirements}
						requirementIcons={requirementIcons}
						summary={summary}
						implemented={implemented}
						enabled={enabled}
						tooltip={title}
						focus={(ctx.actions.get(action.id) as Action | undefined)?.focus}
						onClick={() => {
							if (!canInteract) return;
							void handlePerform(action);
						}}
						onMouseEnter={() => {
							const full = describeContent('action', action.id, ctx);
							const { effects, description } = splitSummary(full);
							handleHoverCard({
								title: `${ctx.actions.get(action.id)?.icon || ''} ${action.name}`,
								effects,
								requirements,
								costs,
								...(description && { description }),
								...(!implemented && {
									description: 'Not implemented yet',
									descriptionClass: 'italic text-red-600',
								}),
								bgClass:
									'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
							});
						}}
						onMouseLeave={clearHoverCard}
					/>
				);
			})}
		</>
	);
}

function RaisePopOptions({
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
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const formatRequirement = (req: string) => req;
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
	return (
		<>
			{roleOptions.map((role) => {
				const costsBag = getActionCosts(action.id, ctx);
				const costs: Record<string, number> = {};
				for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
				let upkeep: Record<string, number> | undefined;
				try {
					upkeep = populationRegistry.get(role)?.upkeep;
				} catch {
					upkeep = undefined;
				}
				const requirements = getActionRequirements(action.id, ctx).map(
					formatRequirement,
				);
				const canPay = Object.entries(costs).every(
					([k, v]) => (player.resources[k] || 0) >= (v ?? 0),
				);
				const meetsReq = requirements.length === 0;
				const enabled = canPay && meetsReq && canInteract;
				const requirementIcons = getRequirementIconsForRole(role);
				const insufficientTooltip = formatMissingResources(
					costs,
					player.resources,
				);
				const title = !meetsReq
					? requirements.join(', ')
					: !canPay
						? (insufficientTooltip ?? 'Cannot pay costs')
						: undefined;
				const summary = describeContent('action', action.id, ctx, { role });
				const shortSummary = summarizeContent('action', action.id, ctx, {
					role,
				});
				return (
					<ActionCard
						key={role}
						title={
							<>
								{ctx.actions.get(action.id).icon || ''}
								{POPULATION_ROLES[role]?.icon} {ctx.actions.get(action.id).name}
								: {POPULATION_ROLES[role]?.label}
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
						focus={(ctx.actions.get(action.id) as Action | undefined)?.focus}
						onClick={() => {
							if (!canInteract) return;
							void handlePerform(action, { role });
						}}
						onMouseEnter={() => {
							const { effects, description } = splitSummary(summary);
							handleHoverCard({
								title: `${ctx.actions.get(action.id).icon || ''}${
									POPULATION_ROLES[role]?.icon
								} ${ctx.actions.get(action.id).name}: ${
									POPULATION_ROLES[role]?.label || ''
								}`,
								effects,
								requirements,
								costs,
								upkeep,
								...(description && { description }),
								bgClass:
									'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
							});
						}}
						onMouseLeave={clearHoverCard}
					/>
				);
			})}
		</>
	);
}

function BasicOptions({
	actions,
	summaries,
	player,
	canInteract,
}: {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div>
			<h3 className="font-medium">
				Basic{' '}
				<span className="italic text-sm font-normal">
					(Effects take place immediately, unless stated otherwise)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				<GenericActions
					actions={actions}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
				/>
			</div>
		</div>
	);
}

function HireOptions({
	action,
	player,
	canInteract,
}: {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div>
			<h3 className="font-medium">
				Hire{' '}
				<span className="italic text-sm font-normal">
					(Recruit population instantly; upkeep and role effects apply while
					they remain)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={canInteract}
				/>
			</div>
		</div>
	);
}

function DevelopOptions({
	action,
	isActionPhase,
	developments,
	summaries,
	hasDevelopLand,
	player,
	canInteract,
}: {
	action: Action;
	isActionPhase: boolean;
	developments: Development[];
	summaries: Map<string, Summary>;
	hasDevelopLand: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		ctx,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const landIdForCost = player.lands[0]?.id as string;
	const entries = useMemo(() => {
		return developments
			.map((d) => {
				const costsBag = getActionCosts(action.id, ctx, {
					id: d.id,
					landId: landIdForCost,
				});
				const costs: Record<string, number> = {};
				for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
				const total = Object.entries(costs).reduce(
					(sum, [k, v]) => (k === actionCostResource ? sum : sum + (v ?? 0)),
					0,
				);
				return { d, costs, total };
			})
			.sort((a, b) => a.total - b.total);
	}, [developments, ctx, action.id, landIdForCost, actionCostResource]);
	return (
		<div>
			<h3 className="font-medium">
				{ctx.actions.get(action.id)?.icon || ''}{' '}
				{ctx.actions.get(action.id)?.name}{' '}
				<span className="italic text-sm font-normal">
					(Effects take place on build and last until development is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ d, costs }) => {
					const upkeep = ctx.developments.get(d.id)?.upkeep;
					const requirements = hasDevelopLand
						? []
						: [
								`Requires ${LAND_INFO.icon} ${LAND_INFO.label} with free ${SLOT_INFO.icon} ${SLOT_INFO.label}`,
							];
					const canPay =
						hasDevelopLand &&
						Object.entries(costs).every(
							([k, v]) => (player.resources[k] || 0) >= (v ?? 0),
						);
					const summary = summaries.get(d.id);
					const implemented = (summary?.length ?? 0) > 0; // TODO: implement development effects
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !hasDevelopLand
							? `No ${LAND_INFO.icon} ${LAND_INFO.label} with free ${SLOT_INFO.icon} ${SLOT_INFO.label}`
							: !canPay
								? (insufficientTooltip ?? 'Cannot pay costs')
								: undefined;
					return (
						<ActionCard
							key={d.id}
							title={
								<>
									{ctx.developments.get(d.id)?.icon} {d.name}
								</>
							}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={[SLOT_INFO.icon]}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={
								(ctx.developments.get(d.id) as Development | undefined)?.focus
							}
							onClick={() => {
								if (!canInteract) return;
								const landId = player.lands.find((l) => l.slotsFree > 0)?.id;
								void handlePerform(action, { id: d.id, landId });
							}}
							onMouseEnter={() => {
								const full = describeContent('development', d.id, ctx);
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: `${ctx.actions.get(action.id)?.icon || ''} ${
										ctx.actions.get(action.id)?.name
									} - ${ctx.developments.get(d.id)?.icon || ''} ${d.name}`,
									effects,
									requirements,
									costs,
									upkeep,
									...(description && { description }),
									...(!implemented && {
										description: 'Not implemented yet',
										descriptionClass: 'italic text-red-600',
									}),
									bgClass:
										'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
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

function BuildOptions({
	action,
	isActionPhase,
	buildings,
	summaries,
	descriptions,
	player,
	canInteract,
}: {
	action: Action;
	isActionPhase: boolean;
	buildings: Building[];
	summaries: Map<string, Summary>;
	descriptions: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		ctx,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, ctx),
		[action.id, ctx],
	);
	const entries = useMemo(() => {
		const owned = player.buildings;
		return buildings
			.filter((b) => !owned.has(b.id))
			.map((b) => {
				const costsBag = getActionCosts(action.id, ctx, { id: b.id });
				const costs: Record<string, number> = {};
				for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
				const total = Object.entries(costs).reduce(
					(sum, [k, v]) => (k === actionCostResource ? sum : sum + (v ?? 0)),
					0,
				);
				return { b, costs, total };
			})
			.sort((a, b) => a.total - b.total);
	}, [buildings, ctx, action.id, actionCostResource, player.buildings.size]);
	return (
		<div>
			<h3 className="font-medium">
				{ctx.actions.get(action.id)?.icon || ''}{' '}
				{ctx.actions.get(action.id)?.name}{' '}
				<span className="italic text-sm font-normal">
					(Effects take place on build and last until building is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ b, costs }) => {
					const requirements = getActionRequirements(action.id, ctx).map(
						(req) => req,
					);
					const canPay = Object.entries(costs).every(
						([k, v]) => (player.resources[k] || 0) >= (v ?? 0),
					);
					const summary = summaries.get(b.id);
					const implemented = (summary?.length ?? 0) > 0; // TODO: implement building effects
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !canPay
							? (insufficientTooltip ?? 'Cannot pay costs')
							: undefined;
					const upkeep = ctx.buildings.get(b.id)?.upkeep;
					return (
						<ActionCard
							key={b.id}
							title={
								<>
									{ctx.buildings.get(b.id)?.icon || ''} {b.name}
								</>
							}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={requirementIcons}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={(ctx.buildings.get(b.id) as Building | undefined)?.focus}
							onClick={() => {
								if (!canInteract) return;
								void handlePerform(action, { id: b.id });
							}}
							onMouseEnter={() => {
								const full = descriptions.get(b.id) ?? [];
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: `${ctx.actions.get(action.id)?.icon || ''} ${
										ctx.actions.get(action.id)?.name
									} - ${ctx.buildings.get(b.id)?.icon || ''} ${b.name}`,
									effects,
									requirements,
									costs,
									upkeep,
									...(description && { description }),
									...(!implemented && {
										description: 'Not implemented yet',
										descriptionClass: 'italic text-red-600',
									}),
									bgClass:
										'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
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

function DemolishOptions({
	action,
	isActionPhase,
	player,
	canInteract,
}: {
	action: Action;
	isActionPhase: boolean;
	player: DisplayPlayer;
	canInteract: boolean;
}) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		ctx,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const entries = useMemo(() => {
		return Array.from(player.buildings)
			.map((id) => {
				const building = ctx.buildings.get(id) as Building | undefined;
				if (!building) return null;
				const costsBag = getActionCosts(action.id, ctx, { id });
				const costs: Record<string, number> = {};
				for (const [k, v] of Object.entries(costsBag)) costs[k] = v ?? 0;
				const total = Object.entries(costs).reduce(
					(sum, [k, v]) => (k === actionCostResource ? sum : sum + (v ?? 0)),
					0,
				);
				return { id, building, costs, total };
			})
			.filter(
				(
					entry,
				): entry is {
					id: string;
					building: Building;
					costs: Record<string, number>;
					total: number;
				} => entry !== null,
			)
			.sort((a, b) => {
				if (a.total !== b.total) return a.total - b.total;
				return a.building.name.localeCompare(b.building.name);
			});
	}, [ctx, action.id, actionCostResource, player.buildings.size]);

	if (entries.length === 0) return null;

	return (
		<div>
			<h3 className="font-medium">
				{ctx.actions.get(action.id)?.icon || ''}{' '}
				{ctx.actions.get(action.id)?.name}{' '}
				<span className="italic text-sm font-normal">
					(Removes a structure and its ongoing benefits)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ id, building, costs }) => {
					const requirements: string[] = [];
					const canPay = Object.entries(costs).every(
						([k, v]) => (player.resources[k] || 0) >= (v ?? 0),
					);
					const summary = summarizeContent('building', id, ctx, {
						installed: true,
					});
					const implemented = (summary?.length ?? 0) > 0;
					const enabled = canPay && isActionPhase && canInteract && implemented;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
					);
					const title = !implemented
						? 'Not implemented yet'
						: !canPay
							? (insufficientTooltip ?? 'Cannot pay costs')
							: undefined;
					const upkeep = ctx.buildings.get(id)?.upkeep;
					return (
						<ActionCard
							key={id}
							title={
								<>
									{ctx.buildings.get(id)?.icon || ''} {building.name}
								</>
							}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={[]}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={(ctx.buildings.get(id) as Building | undefined)?.focus}
							onClick={() => {
								if (!canInteract) return;
								void handlePerform(action, { id });
							}}
							onMouseEnter={() => {
								const full = describeContent('building', id, ctx, {
									installed: true,
								});
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: `${ctx.actions.get(action.id)?.icon || ''} ${
										ctx.actions.get(action.id)?.name
									} - ${ctx.buildings.get(id)?.icon || ''} ${building.name}`,
									effects,
									requirements,
									costs,
									upkeep,
									...(description && { description }),
									...(!implemented && {
										description: 'Not implemented yet',
										descriptionClass: 'italic text-red-600',
									}),
									bgClass:
										'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
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

export default function ActionsPanel() {
	const { ctx, tabsEnabled, actionCostResource } = useGameEngine();
	const sectionRef = useAnimate<HTMLDivElement>();
	const player = ctx.game.players[0]!;
	const opponent = ctx.game.players[1]!;
	const [viewingOpponent, setViewingOpponent] = useState(false);

	const actionPhaseId = useMemo(
		() => ctx.phases.find((p) => p.action)?.id,
		[ctx],
	);
	const isActionPhase = isActionPhaseActive(
		ctx.game.currentPhase,
		actionPhaseId,
		tabsEnabled,
	);
	const isLocalTurn = ctx.activePlayer.id === player.id;

	useEffect(() => {
		if (!isLocalTurn && viewingOpponent) setViewingOpponent(false);
	}, [isLocalTurn, viewingOpponent]);

	const selectedPlayer = viewingOpponent ? opponent : player;
	const canInteract = isLocalTurn && isActionPhase && !viewingOpponent;
	const panelDisabled = !canInteract;

	const actions = useMemo<Action[]>(
		() =>
			Array.from(
				(ctx.actions as unknown as { map: Map<string, Action> }).map.values(),
			)
				.filter((a) => !a.system || selectedPlayer.actions.has(a.id))
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
		[ctx, selectedPlayer.actions.size, selectedPlayer.id],
	);
	const developmentOptions = useMemo<Development[]>(
		() =>
			Array.from(
				(
					ctx.developments as unknown as { map: Map<string, Development> }
				).map.values(),
			)
				.filter((d) => !d.system)
				.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
		[ctx],
	);
	const buildingOptions = useMemo<Building[]>(
		() =>
			Array.from(
				(
					ctx.buildings as unknown as { map: Map<string, Building> }
				).map.values(),
			),
		[ctx],
	);

	const actionSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		actions.forEach((a) =>
			map.set(a.id, summarizeContent('action', a.id, ctx)),
		);
		return map;
	}, [actions, ctx]);
	const developmentSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		developmentOptions.forEach((d) =>
			map.set(d.id, summarizeContent('development', d.id, ctx)),
		);
		return map;
	}, [developmentOptions, ctx]);
	const buildingSummaries = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((b) =>
			map.set(b.id, summarizeContent('building', b.id, ctx)),
		);
		return map;
	}, [buildingOptions, ctx]);
	const buildingDescriptions = useMemo(() => {
		const map = new Map<string, Summary>();
		buildingOptions.forEach((b) =>
			map.set(b.id, describeContent('building', b.id, ctx)),
		);
		return map;
	}, [buildingOptions, ctx]);

	const hasDevelopLand = selectedPlayer.lands.some((l) => l.slotsFree > 0);
	const developAction = actions.find((a) => a.category === 'development');
	const buildAction = actions.find((a) => a.category === 'building');
	const demolishAction = actions.find((a) => a.category === 'building_remove');
	const raisePopAction = actions.find((a) => a.category === 'population');
	const otherActions = actions.filter(
		(a) => (a.category ?? 'basic') === 'basic',
	);

	const toggleLabel = viewingOpponent
		? 'Show player actions'
		: 'Show opponent actions';

	return (
		<section
			className="relative rounded-3xl border border-white/60 bg-white/75 p-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50 frosted-surface"
			aria-disabled={panelDisabled || undefined}
		>
			{panelDisabled && (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/70 via-white/55 to-white/10 ring-1 ring-inset ring-white/60 dark:from-slate-100/15 dark:via-slate-100/10 dark:to-transparent dark:ring-white/10"
				/>
			)}
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
					{viewingOpponent ? `${opponent.name} Actions` : 'Actions'}{' '}
					<span className="text-base font-normal text-slate-500 dark:text-slate-300">
						(1 {RESOURCES[actionCostResource].icon} each)
					</span>
				</h2>
				<div className="flex flex-wrap items-center gap-2">
					{viewingOpponent && (
						<span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200 frosted-surface">
							<span>Viewing Opponent</span>
						</span>
					)}
					{!isActionPhase && (
						<span className="rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-200 frosted-surface">
							<span>Not In Main Phase</span>
						</span>
					)}
					{isLocalTurn && (
						<button
							type="button"
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-lg font-semibold text-slate-700 shadow-md transition hover:bg-white/90 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
							onClick={() => setViewingOpponent((prev) => !prev)}
							aria-label={toggleLabel}
						>
							{viewingOpponent ? '←' : '→'}
						</button>
					)}
				</div>
			</div>
			<div className="relative">
				<div ref={sectionRef} className="space-y-4">
					{otherActions.length > 0 && (
						<BasicOptions
							actions={otherActions}
							summaries={actionSummaries}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{raisePopAction && (
						<HireOptions
							action={raisePopAction}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{developAction && (
						<DevelopOptions
							action={developAction}
							isActionPhase={isActionPhase}
							developments={developmentOptions}
							summaries={developmentSummaries}
							hasDevelopLand={hasDevelopLand}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{buildAction && (
						<BuildOptions
							action={buildAction}
							isActionPhase={isActionPhase}
							buildings={buildingOptions}
							summaries={buildingSummaries}
							descriptions={buildingDescriptions}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
					{demolishAction && (
						<DemolishOptions
							action={demolishAction}
							isActionPhase={isActionPhase}
							player={selectedPlayer}
							canInteract={canInteract}
						/>
					)}
				</div>
			</div>
		</section>
	);
}
