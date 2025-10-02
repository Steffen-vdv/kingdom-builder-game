import type { EffectDef } from '../effects';
import type { EngineContext } from '../context';
import type { EvaluatorDef } from '../evaluators';
import type {
	PlayerState,
	StatKey,
	StatSourceLink,
	StatSourceMeta,
} from '../state';

export const STAT_SOURCE_EPSILON = 1e-9;

export interface StatSourceMetaPartial {
	key?: string;
	longevity?: 'ongoing' | 'permanent';
	kind?: string;
	id?: string;
	detail?: string;
	instance?: string;
	dependsOn?: StatSourceLink[];
	removal?: StatSourceLink;
	effect?: { type?: string; method?: string };
	extra?: Record<string, unknown>;
}

export type StatSourceFrame = (
	effectDefinition: EffectDef,
	context: EngineContext,
	statKey: StatKey,
) => StatSourceMetaPartial | undefined;

export type { PlayerState, StatKey, StatSourceLink, StatSourceMeta };

export interface EvaluatorDependencyCollector {
	(evaluator: EvaluatorDef): StatSourceLink[];
}
