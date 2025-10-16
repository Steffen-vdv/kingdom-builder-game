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
