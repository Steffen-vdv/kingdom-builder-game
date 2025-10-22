import { ResourceV2ReconciliationStrategy } from './types';
import type {
	ResourceV2BoundAdjustmentDefinition,
	ResourceV2BoundsConfig,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2GroupParentInput,
	ResourceV2GroupParentMetadata,
	ResourceV2TierTrack,
	ResourceV2TransferEffectDefinition,
	ResourceV2TransferEndpointDefinition,
	ResourceV2ValueEffectDefinition,
} from './types';

const DUPLICATE_TIER_MESSAGE =
	'ResourceV2 definitions may only configure a single tier track. Remove the duplicate tierTrack() call.';
const CLAMP_ONLY_MESSAGE =
	'ResourceV2 MVP only supports clamp reconciliation. Remove the unsupported reconciliation configuration.';
const PARENT_LIMITED_MESSAGE =
	'ResourceV2 group parents are limited resources and cannot allow direct value mutations.';

function cloneTierStep(
	step: ResourceV2TierTrack['steps'][number],
): ResourceV2TierTrack['steps'][number] {
	const cloned: ResourceV2TierTrack['steps'][number] = {
		id: step.id,
		min: step.min,
	};
	if (step.max !== undefined) {
		cloned.max = step.max;
	}
	if (step.enterEffects && step.enterEffects.length > 0) {
		cloned.enterEffects = [...step.enterEffects];
	}
	if (step.exitEffects && step.exitEffects.length > 0) {
		cloned.exitEffects = [...step.exitEffects];
	}
	if (step.passives && step.passives.length > 0) {
		cloned.passives = [...step.passives];
	}
	if (step.display) {
		cloned.display = { ...step.display };
	}
	return cloned;
}

function cloneTierTrack(track: ResourceV2TierTrack): ResourceV2TierTrack {
	const cloned: ResourceV2TierTrack = {
		id: track.id,
		steps: track.steps.map((step) => cloneTierStep(step)),
	};
	if (track.display) {
		cloned.display = { ...track.display };
	}
	return cloned;
}

function cloneParentMetadata(
	parent: ResourceV2GroupParentInput,
): ResourceV2GroupParentMetadata {
	if (parent.limited === false) {
		throw new Error(PARENT_LIMITED_MESSAGE);
	}
	return {
		...parent,
		limited: true,
	};
}

export class ResourceV2TierTrackBuilder {
	private readonly config: ResourceV2TierTrack;

	constructor(id: string) {
		this.config = { id, steps: [] };
	}

	step(step: ResourceV2TierTrack['steps'][number]) {
		this.config.steps = [...this.config.steps, cloneTierStep(step)];
		return this;
	}

	display(display: ResourceV2TierTrack['display']) {
		this.config.display = { ...display };
		return this;
	}

	build(): ResourceV2TierTrack {
		return cloneTierTrack(this.config);
	}
}

class ResourceV2GroupBuilder {
	constructor(private readonly metadata: ResourceV2GroupMetadata) {}

	parent(parent: ResourceV2GroupParentInput) {
		if (this.metadata.parent) {
			throw new Error(
				'ResourceV2 group already defines a virtual parent. Remove the extra parent() call.',
			);
		}
		this.metadata.parent = cloneParentMetadata(parent);
	}
}

export class ResourceV2Builder {
	private readonly definition: ResourceV2Definition;

	constructor(id: string) {
		this.definition = {
			id,
			display: {
				icon: '',
				label: '',
				description: '',
				order: 0,
			},
		};
	}

	icon(icon: string) {
		this.definition.display.icon = icon;
		return this;
	}

	label(label: string) {
		this.definition.display.label = label;
		return this;
	}

	description(description: string) {
		this.definition.display.description = description;
		return this;
	}

	order(order: number) {
		this.definition.display.order = order;
		return this;
	}

	percent(flag = true) {
		this.definition.display.percent = flag;
		return this;
	}

	lowerBound(value: number | undefined) {
		const next: ResourceV2BoundsConfig = {};
		if (value !== undefined) {
			next.lowerBound = value;
		}
		if (this.definition.bounds?.upperBound !== undefined) {
			next.upperBound = this.definition.bounds.upperBound;
		}
		if (Object.keys(next).length > 0) {
			this.definition.bounds = next;
		} else {
			delete this.definition.bounds;
		}
		return this;
	}

	upperBound(value: number | undefined) {
		const next: ResourceV2BoundsConfig = {};
		if (this.definition.bounds?.lowerBound !== undefined) {
			next.lowerBound = this.definition.bounds.lowerBound;
		}
		if (value !== undefined) {
			next.upperBound = value;
		}
		if (Object.keys(next).length > 0) {
			this.definition.bounds = next;
		} else {
			delete this.definition.bounds;
		}
		return this;
	}

	trackValueBreakdown(flag = true) {
		this.definition.trackValueBreakdown = flag;
		return this;
	}

	trackBoundBreakdown(flag = true) {
		this.definition.trackBoundBreakdown = flag;
		return this;
	}

	tierTrack(track: ResourceV2TierTrack) {
		if (this.definition.tierTrack) {
			throw new Error(DUPLICATE_TIER_MESSAGE);
		}
		this.definition.tierTrack = cloneTierTrack(track);
		return this;
	}

	group(
		groupId: string,
		order: number,
		configure?: (builder: ResourceV2GroupBuilder) => void,
	) {
		if (this.definition.group) {
			throw new Error(
				'ResourceV2 definition already assigned group metadata. Remove the duplicate group() call.',
			);
		}
		const metadata: ResourceV2GroupMetadata = { groupId, order };
		if (configure) {
			const builder = new ResourceV2GroupBuilder(metadata);
			configure(builder);
		}
		this.definition.group = metadata.parent
			? { ...metadata, parent: { ...metadata.parent } }
			: { ...metadata };
		return this;
	}

	build(): ResourceV2Definition {
		const result: ResourceV2Definition = {
			...this.definition,
			display: { ...this.definition.display },
		};
		if (this.definition.bounds) {
			result.bounds = { ...this.definition.bounds };
		}
		if (this.definition.tierTrack) {
			result.tierTrack = cloneTierTrack(this.definition.tierTrack);
		}
		if (this.definition.group) {
			result.group = this.definition.group.parent
				? {
						...this.definition.group,
						parent: { ...this.definition.group.parent },
					}
				: { ...this.definition.group };
		}
		return result;
	}
}

function ensureClamp(
	reconciliation: ResourceV2ReconciliationStrategy | undefined,
): ResourceV2ReconciliationStrategy {
	if (
		reconciliation !== undefined &&
		reconciliation !== ResourceV2ReconciliationStrategy.Clamp
	) {
		throw new Error(CLAMP_ONLY_MESSAGE);
	}
	return ResourceV2ReconciliationStrategy.Clamp;
}

export interface ResourceV2ValueEffectOptions {
	resourceId: string;
	amount: number;
	reconciliation?: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export function resourceV2Add(
	options: ResourceV2ValueEffectOptions,
): ResourceV2ValueEffectDefinition {
	const reconciliation = ensureClamp(options.reconciliation);
	const effect: ResourceV2ValueEffectDefinition = {
		kind: 'resource:add',
		resourceId: options.resourceId,
		amount: options.amount,
		reconciliation,
	};
	if (options.suppressHooks) {
		effect.suppressHooks = true;
	}
	return effect;
}

export function resourceV2Remove(
	options: ResourceV2ValueEffectOptions,
): ResourceV2ValueEffectDefinition {
	const reconciliation = ensureClamp(options.reconciliation);
	const effect: ResourceV2ValueEffectDefinition = {
		kind: 'resource:remove',
		resourceId: options.resourceId,
		amount: options.amount,
		reconciliation,
	};
	if (options.suppressHooks) {
		effect.suppressHooks = true;
	}
	return effect;
}

export interface ResourceV2TransferEndpointOptions {
	resourceId: string;
	reconciliation?: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2TransferEffectOptions {
	donor: ResourceV2TransferEndpointOptions;
	recipient: ResourceV2TransferEndpointOptions;
	amount: number;
	suppressHooks?: boolean;
}

function buildEndpoint(
	endpoint: ResourceV2TransferEndpointOptions,
): ResourceV2TransferEndpointDefinition {
	return {
		resourceId: endpoint.resourceId,
		reconciliation: ensureClamp(endpoint.reconciliation),
	};
}

export function resourceV2Transfer(
	options: ResourceV2TransferEffectOptions,
): ResourceV2TransferEffectDefinition {
	const effect: ResourceV2TransferEffectDefinition = {
		kind: 'resource:transfer',
		donor: buildEndpoint(options.donor),
		recipient: buildEndpoint(options.recipient),
		amount: options.amount,
	};
	if (options.suppressHooks) {
		effect.suppressHooks = true;
	}
	return effect;
}

export interface ResourceV2BoundAdjustmentOptions {
	resourceId: string;
	amount: number;
	reconciliation?: ResourceV2ReconciliationStrategy;
}

export function resourceV2LowerBoundIncrease(
	options: ResourceV2BoundAdjustmentOptions,
): ResourceV2BoundAdjustmentDefinition {
	return {
		kind: 'resource:lower-bound:increase',
		resourceId: options.resourceId,
		amount: options.amount,
		reconciliation: ensureClamp(options.reconciliation),
	};
}

export function resourceV2UpperBoundIncrease(
	options: ResourceV2BoundAdjustmentOptions,
): ResourceV2BoundAdjustmentDefinition {
	return {
		kind: 'resource:upper-bound:increase',
		resourceId: options.resourceId,
		amount: options.amount,
		reconciliation: ensureClamp(options.reconciliation),
	};
}

export function resourceV2LowerBoundDecrease(): never {
	throw new Error(
		'ResourceV2 MVP defers lower-bound decrease effects. Remove the resourceV2LowerBoundDecrease() call.',
	);
}

export function resourceV2(id: string): ResourceV2Builder {
	return new ResourceV2Builder(id);
}

export function resourceV2TierTrack(id: string): ResourceV2TierTrackBuilder {
	return new ResourceV2TierTrackBuilder(id);
}
