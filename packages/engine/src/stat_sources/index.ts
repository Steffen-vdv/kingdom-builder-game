export {
	collectEvaluatorDependencies,
	evaluatorDependencyCollectorRegistry,
	registerEvaluatorDependencyCollector,
} from './dependencies';
export { withStatSourceFrames } from './frames';
export {
	applyStatDelta,
	recordEffectStatDelta,
	resolveStatSourceMeta,
} from './resolver';
export type {
	StatSourceFrame,
	StatSourceMetaPartial,
	EvaluatorDependencyCollector,
} from './types';
