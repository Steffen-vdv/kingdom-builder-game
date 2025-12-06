import { selectSlotDisplay } from '../translation';
import type { TranslationContext } from '../translation';

interface EvalConfig {
	type: string;
	params?: Record<string, unknown>;
}

export type EvaluatorIconGetter = (
	params: Record<string, unknown> | undefined,
	translationContext: TranslationContext,
) => string[];

/**
 * Unified ResourceV2 icon getter. Stats, population, and resources all use
 * the same metadata lookup since they are all ResourceV2 resources.
 */
function getResourceV2Icon(
	params: Record<string, unknown> | undefined,
	translationContext: TranslationContext,
): string[] {
	const resourceId = params?.['resourceId'] as string | undefined;
	if (!resourceId) {
		return [];
	}
	const metadata = translationContext.resourceMetadataV2.get(resourceId);
	return metadata.icon ? [metadata.icon] : [];
}

export const EVALUATOR_ICON_MAP: Record<string, EvaluatorIconGetter> = {
	stat: getResourceV2Icon,
	population: getResourceV2Icon,
	resource: getResourceV2Icon,
	land: (_params, translationContext) => {
		const icon = selectSlotDisplay(translationContext.assets).icon;
		return icon ? [icon] : [];
	},
};

function collectEvaluatorIcons(
	evaluator: EvalConfig | undefined,
	translationContext: TranslationContext,
): string[] {
	if (!evaluator) {
		return [];
	}
	return (
		EVALUATOR_ICON_MAP[evaluator.type]?.(
			evaluator.params,
			translationContext,
		) ?? []
	);
}

interface RequirementConfig {
	type: string;
	method: string;
	params?: Record<string, unknown>;
}

export type RequirementIconGetter = (
	requirement: RequirementConfig,
	translationContext: TranslationContext,
) => string[];

/**
 * Registry mapping requirement `type:method` pairs to icon extractors.
 *
 * Register additional handlers via {@link registerRequirementIconGetter}:
 *
 * ```ts
 * const unregister = registerRequirementIconGetter(
 *         'myType',
 *         'myMethod',
 *         (requirement, ctx) => {
 *         // derive icons from requirement.params / ctx
 *         return ['🛠️'];
 *         },
 * );
 * // Call unregister() in tests or teardown logic if necessary.
 * ```
 */
export const REQUIREMENT_ICON_GETTERS = new Map<
	string,
	RequirementIconGetter
>();

export function registerRequirementIconGetter(
	type: string,
	method: string,
	getter: RequirementIconGetter,
): () => void {
	const registryKey = `${type}:${method}`;
	REQUIREMENT_ICON_GETTERS.set(registryKey, getter);
	return () => {
		const current = REQUIREMENT_ICON_GETTERS.get(registryKey);
		if (current === getter) {
			REQUIREMENT_ICON_GETTERS.delete(registryKey);
		}
	};
}

registerRequirementIconGetter(
	'evaluator',
	'compare',
	(requirement, translationContext) => {
		const params = requirement.params ?? {};
		return [
			...collectEvaluatorIcons(
				params['left'] as EvalConfig | undefined,
				translationContext,
			),
			...collectEvaluatorIcons(
				params['right'] as EvalConfig | undefined,
				translationContext,
			),
		];
	},
);

export function getRequirementIcons(
	actionId: string,
	translationContext: TranslationContext,
): string[] {
	const actionDefinition = translationContext.actions.get(actionId);
	if (!actionDefinition?.requirements) {
		return [];
	}
	const icons: string[] = [];
	const requirements = actionDefinition.requirements as RequirementConfig[];
	for (const requirement of requirements) {
		const registryKey = `${requirement.type}:${requirement.method}`;
		const getter = REQUIREMENT_ICON_GETTERS.get(registryKey);
		if (!getter) {
			continue;
		}
		icons.push(...getter(requirement, translationContext));
	}
	return icons.filter(Boolean);
}
