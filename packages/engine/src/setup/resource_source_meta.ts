import type { ResourceSourceMeta } from '../state';

export const START_RESOURCE_SOURCE_META: ResourceSourceMeta = {
	key: 'start:setup',
	longevity: 'permanent',
	kind: 'start',
	detail: 'Initial setup',
};
