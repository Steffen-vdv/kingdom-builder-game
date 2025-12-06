import type {
	RuntimeResourceTierDefinition,
	RuntimeResourceTierThreshold,
	RuntimeResourceTierTrack,
	RuntimeResourceTierTrackMetadata,
} from './types';

import type {
	ContentTierDefinition,
	ContentTierTrack,
	ContentTierTrackMetadata,
	ContentTierThreshold,
} from './content-types';

const RUNTIME_PREFIX = 'ResourceV2 runtime';

type NumericField =
	| 'tier.metadata.order'
	| 'tier.order'
	| 'tier.threshold.min'
	| 'tier.threshold.max';

function assertInteger(
	value: number,
	field: NumericField,
	context: string,
): void {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${RUNTIME_PREFIX} expected ${context} ${field} to be an integer ` +
				`but received ${value}.`,
		);
	}
}

function normalizeTierThreshold(
	threshold: ContentTierThreshold,
	context: string,
): RuntimeResourceTierThreshold {
	const { min, max } = threshold ?? {};
	if (typeof min === 'number') {
		assertInteger(min, 'tier.threshold.min', context);
	}
	if (typeof max === 'number') {
		assertInteger(max, 'tier.threshold.max', context);
	}
	return Object.freeze({
		min: typeof min === 'number' ? min : null,
		max: typeof max === 'number' ? max : null,
	});
}

function normalizeTierMetadata(
	metadata: ContentTierTrackMetadata,
	context: string,
	fallbackOrder: number,
): RuntimeResourceTierTrackMetadata {
	const { order } = metadata;
	if (typeof order === 'number') {
		assertInteger(order, 'tier.metadata.order', context);
	}
	return {
		id: metadata.id,
		label: metadata.label,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : fallbackOrder,
		...(metadata.icon !== undefined ? { icon: metadata.icon } : {}),
		...(metadata.description !== undefined
			? { description: metadata.description }
			: {}),
	};
}

function normalizeTierDefinition(
	definition: ContentTierDefinition,
	context: string,
	fallbackOrder: number,
): RuntimeResourceTierDefinition {
	const tierContext = `${context} tier "${definition.id}"`;
	const { order, enterEffects, exitEffects } = definition;
	if (typeof order === 'number') {
		assertInteger(order, 'tier.order', tierContext);
	}
	const runtime: RuntimeResourceTierDefinition = {
		id: definition.id,
		label: definition.label,
		order: typeof order === 'number' ? order : null,
		resolvedOrder: typeof order === 'number' ? order : fallbackOrder,
		threshold: normalizeTierThreshold(definition.threshold, tierContext),
		enterEffects: Object.freeze([...(enterEffects ?? [])]),
		exitEffects: Object.freeze([...(exitEffects ?? [])]),
		...(definition.icon !== undefined ? { icon: definition.icon } : {}),
		...(definition.description !== undefined
			? { description: definition.description }
			: {}),
	};
	return Object.freeze(runtime);
}

export function normalizeTierTrack(
	track: ContentTierTrack | undefined,
	context: string,
): RuntimeResourceTierTrack | undefined {
	if (!track) {
		return undefined;
	}
	const metadata = normalizeTierMetadata(track.metadata, context, 0);
	const tiers = track.tiers.map((tier, index) =>
		normalizeTierDefinition(tier, context, index),
	);
	return Object.freeze({
		metadata: Object.freeze({ ...metadata }),
		tiers: Object.freeze([...tiers]),
	});
}
