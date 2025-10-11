import type { PopulationConfig } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../translation/context';
import type { IconLabelDisplay } from './actionSelectors';
import type { Action } from './types';

export type PopulationRoleId = string;

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

export function createPopulationRegistry(
	context: Pick<TranslationContext, 'populations' | 'assets'>,
): PopulationRegistryLike {
	const keys = Object.keys(context.assets.populations);
	return {
		get(id: string) {
			return context.populations.get(id);
		},
		entries() {
			const entries: [string, PopulationDefinition][] = [];
			for (const key of keys) {
				try {
					const definition = context.populations.get(key);
					entries.push([key, definition]);
				} catch {
					// Ignore missing entries in translation assets.
				}
			}
			return entries;
		},
	};
}

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
	resolveDisplay: (roleId: string) => IconLabelDisplay,
): string {
	if (!role) {
		return '';
	}
	const display = resolveDisplay(role);
	if (display.icon) {
		return display.icon;
	}
	try {
		const population = populations.get(role);
		if (typeof population?.icon === 'string') {
			return population.icon;
		}
	} catch {
		// Ignore missing population entries when deriving icons.
	}
	return resolveDisplay('').icon ?? '';
}

function getIconsFromEvaluator(
	evaluator: EvaluatorConfig | undefined,
	roleId: PopulationRoleId,
	populations: PopulationRegistryLike,
	resolveDisplay: (roleId: string) => IconLabelDisplay,
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
					resolveDisplay,
				);
				return icon ? [icon] : [];
			}
			const placeholderIcon = getPopulationIconFromRole(
				rawRole.slice(1),
				populations,
				resolveDisplay,
			);
			return placeholderIcon ? [placeholderIcon] : [];
		}
		const icon = getPopulationIconFromRole(
			rawRole,
			populations,
			resolveDisplay,
		);
		return icon ? [icon] : [];
	}
	const genericIcon = resolveDisplay('').icon;
	return genericIcon ? [genericIcon] : [];
}

export function determineRaisePopRoles(
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
			result.push(roleId);
		} catch {
			// Ignore missing population ids when collecting options.
		}
	}
	return result;
}

export function buildRequirementIconsForRole(
	actionDefinition: Action | undefined,
	roleId: PopulationRoleId,
	baseIcons: string[],
	populations: PopulationRegistryLike,
	resolveDisplay: (roleId: string) => IconLabelDisplay,
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
			resolveDisplay,
		)) {
			icons.add(icon);
		}
		for (const icon of getIconsFromEvaluator(
			right,
			roleId,
			populations,
			resolveDisplay,
		)) {
			icons.add(icon);
		}
	}
	return Array.from(icons).filter(Boolean);
}
