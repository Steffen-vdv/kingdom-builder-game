export * from './effects';
export * from './content';
export * from './log';
export * from './render';
export * from './context';
export * from './requirements';
/**
 * Resource formatter helpers expect metadata snapshots (id, label, icon,
 * description, and display flags) paired with value snapshots (current value,
 * optional previous or explicit delta, bounds, and forecast deltas). The
 * helpers return summary strings, hovercard sections, and Option A signed gain
 * entries derived from those inputs.
 */
export {
	buildResourceHoverSections,
	buildResourceSignedGainEntries,
	formatResourceSummary,
} from './resource';
export type {
	ResourceMetadataSnapshot,
	ResourceValueSnapshot,
} from './resource';
