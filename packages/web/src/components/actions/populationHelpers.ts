import type { PopulationConfig } from '@kingdom-builder/protocol';
import type { RegistryMetadataDescriptor } from '../../contexts/RegistryMetadataContext';
import type { Action } from './types';

export type PopulationDefinition = PopulationConfig;

export type EffectConfig = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
	effects?: EffectConfig[];
};

export interface PopulationRegistryLike {
	get(id: string): PopulationDefinition;
	entries(): [string, PopulationDefinition][];
}

export type PopulationDescriptorSelector = (
	roleId: string,
) => RegistryMetadataDescriptor;

type RequirementConfig = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
};

type EvaluatorConfig = {
	type?: string;
	params?: Record<string, unknown>;
};

export function isHirablePopulation(
	population: PopulationDefinition | undefined,
): boolean {
	if (!population) {
		return false;
	}
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

export function collectPopulationRolesFromEffects(
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

export function getPopulationIconFromRole(
	role: string,
	populations: PopulationRegistryLike,
	selectDescriptor: PopulationDescriptorSelector,
	defaultIcon?: string,
): string {
	if (!role) {
		return '';
	}
	try {
		const descriptor = selectDescriptor(role);
		if (descriptor.icon) {
			return descriptor.icon;
		}
	} catch {
		// Ignore descriptor lookup errors for unknown roles.
	}
	try {
		const population = populations.get(role);
		if (typeof population?.icon === 'string') {
			return population.icon;
		}
	} catch {
		// Ignore missing population entries when deriving icons.
	}
	return defaultIcon ?? '';
}

/**
 * Derive population-related icons from an evaluator configuration.
 *
 * Examines a `population`-type evaluator's `role` parameter and resolves the corresponding icon(s)
 * using the provided population registry and descriptor selector.
 *
 * @param evaluator - The evaluator to inspect; only evaluators with `type: 'population'` are used.
 * @param roleId - The current role id used when the evaluator's role is the special `$role` placeholder.
 * @param populations - Registry used to resolve population definitions by role id.
 * @param selectDescriptor - Function to obtain a population descriptor (for example to read a descriptor icon).
 * @param defaultIcon - Fallback icon to use when the evaluator's role is not a string or no specific icon is found.
 * @returns An array of resolved icon identifiers. When a single icon is resolved it is returned as a one-element array; returns an empty array if no icon could be resolved.
 */
function getIconsFromEvaluator(
	evaluator: EvaluatorConfig | undefined,
	roleId: string,
	populations: PopulationRegistryLike,
	selectDescriptor: PopulationDescriptorSelector,
	defaultIcon?: string,
): string[] {
	if (!evaluator || evaluator.type !== 'population') {
		return [];
	}
	const params = evaluator.params ?? {};
	const rawRole = params['role'];
	if (typeof rawRole === 'string') {
		if (rawRole.startsWith('$')) {
			if (rawRole === '$role') {
				const icon = getPopulationIconFromRole(
					roleId,
					populations,
					selectDescriptor,
					defaultIcon,
				);
				return icon ? [icon] : [];
			}
			const placeholderIcon = getPopulationIconFromRole(
				rawRole.slice(1),
				populations,
				selectDescriptor,
				defaultIcon,
			);
			return placeholderIcon ? [placeholderIcon] : [];
		}
		const icon = getPopulationIconFromRole(
			rawRole,
			populations,
			selectDescriptor,
			defaultIcon,
		);
		return icon ? [icon] : [];
	}
	return defaultIcon ? [defaultIcon] : [];
}

/**
 * Compute an ordered list of population role IDs eligible for raising based on the action and available populations.
 *
 * @param actionDefinition - The action definition whose effects may declare explicit roles or placeholders
 * @param populations - Registry of population definitions used to determine hirable populations
 * @returns An ordered array of role IDs eligible for population raises. Explicit roles extracted from the action appear first; if the action uses placeholders or no explicit roles are present, additional hirable populations from the registry are appended.
export function determineRaisePopRoles(
	actionDefinition: Action | undefined,
	populations: PopulationRegistryLike,
): string[] {
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
	const result: string[] = [];
	for (const roleId of orderedRoles) {
		let population: PopulationDefinition | undefined;
		try {
			population = populations.get(roleId);
		} catch {
			population = undefined;
		}
		if (
			!explicitRoles.has(roleId) &&
			population &&
			!isHirablePopulation(population)
		) {
			continue;
		}
		result.push(roleId);
	}
	return result;
}

/**
 * Assembles icons relevant to a role based on an action's evaluator requirements and the provided base icons.
 *
 * @param actionDefinition - The action definition whose requirements will be scanned for evaluator comparisons.
 * @param roleId - The role identifier used to resolve placeholder evaluators (e.g., `$role`).
 * @param baseIcons - Initial list of icons to include in the result.
 * @param populations - Registry used to resolve population entries and their icons by role id.
 * @param selectDescriptor - Selector function that returns a metadata descriptor (which may include an `icon`) for a given role id.
 * @param defaultIcon - Optional fallback icon to use when an evaluator references an unresolved role.
 * @returns An array of unique, truthy icon identifiers combining `baseIcons` and any icons derived from evaluator requirements.
export function buildRequirementIconsForRole(
	actionDefinition: Action | undefined,
	roleId: string,
	baseIcons: string[],
	populations: PopulationRegistryLike,
	selectDescriptor: PopulationDescriptorSelector,
	defaultIcon?: string,
): string[] {
	const icons = new Set(baseIcons);
	const requirements = actionDefinition?.requirements as
		| RequirementConfig[]
		| undefined;
	if (!requirements) {
		return Array.from(icons).filter(Boolean);
	}
	for (const requirement of requirements) {
		if (requirement.type !== 'evaluator' || requirement.method !== 'compare') {
			continue;
		}
		const params = requirement.params ?? {};
		const left = params['left'] as EvaluatorConfig | undefined;
		const right = params['right'] as EvaluatorConfig | undefined;
		for (const icon of getIconsFromEvaluator(
			left,
			roleId,
			populations,
			selectDescriptor,
			defaultIcon,
		)) {
			icons.add(icon);
		}
		for (const icon of getIconsFromEvaluator(
			right,
			roleId,
			populations,
			selectDescriptor,
			defaultIcon,
		)) {
			icons.add(icon);
		}
	}
	return Array.from(icons).filter(Boolean);
}