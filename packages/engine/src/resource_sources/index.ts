export {
	collectEvaluatorDependencies,
	evaluatorDependencyCollectorRegistry,
	registerEvaluatorDependencyCollector,
} from './dependencies';
export { withResourceSourceFrames } from './frames';
export {
	applyResourceDelta,
	recordEffectResourceDelta,
	resolveResourceSourceMeta,
} from './resolver';
export type {
	ResourceSourceFrame,
	ResourceSourceMetaPartial,
	EvaluatorDependencyCollector,
} from './types';
