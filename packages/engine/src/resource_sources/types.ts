import type { EffectDef } from '../effects';
import type { EngineContext } from '../context';
import type { EvaluatorDef } from '../evaluators';
import type {
	PlayerState,
	ResourceKey,
	ResourceSourceLink,
	ResourceSourceMeta,
} from '../state';

export const RESOURCE_SOURCE_EPSILON = 1e-9;

export interface ResourceSourceMetaPartial {
	sourceKey?: string;
	longevity?: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: ResourceSourceLink[];
	removal?: ResourceSourceLink;
	effect?: { type?: string; method?: string };
	extra?: Record<string, unknown>;
}

export type ResourceSourceFrame = (
	effectDefinition: EffectDef,
	context: EngineContext,
	resourceKey: ResourceKey,
) => ResourceSourceMetaPartial | undefined;

export type {
	PlayerState,
	ResourceKey,
	ResourceSourceLink,
	ResourceSourceMeta,
};

export interface EvaluatorDependencyCollector {
	(evaluator: EvaluatorDef): ResourceSourceLink[];
}
