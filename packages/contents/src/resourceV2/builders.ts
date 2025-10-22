import { ResourceV2Reconciliation } from './types';
import type {
	ResourceV2Definition,
	ResourceV2EffectDefinition,
	ResourceV2GroupDefinition,
	ResourceV2RoundingMode,
	ResourceV2TierStepDefinition,
	ResourceV2TierTrackDefinition,
} from './types';

interface ResourceV2ValueEffectOptions {
	round?: ResourceV2RoundingMode;
	reconciliation?: ResourceV2Reconciliation;
	suppressHooks?: boolean;
	target?: 'resource' | 'virtualParent';
}

interface ResourceV2TransferEffectOptions {
	donorReconciliation?: ResourceV2Reconciliation;
	recipientReconciliation?: ResourceV2Reconciliation;
	suppressHooks?: boolean;
}

interface ResourceV2BoundEffectOptions {
	reconciliation?: ResourceV2Reconciliation;
}

function ensureClamp(
	option: ResourceV2Reconciliation | undefined,
	field: string,
) {
	if (option === undefined) {
		return ResourceV2Reconciliation.Clamp;
	}
	if (option !== ResourceV2Reconciliation.Clamp) {
		throw new Error(
			`${field} only supports clamp reconciliation during the ResourceV2 MVP rollout.`,
		);
	}
	return option;
}

function applyHookSuppression(
	effect: ResourceV2EffectDefinition,
	suppressHooks: boolean | undefined,
) {
	if (suppressHooks) {
		effect.suppressHooks = true;
	}
	return effect;
}

function guardVirtualParent(target: 'resource' | 'virtualParent' | undefined) {
	if (target === 'virtualParent') {
		throw new Error(
			'Virtual parent resources are limited and cannot be mutated directly. Target a child resource instead.',
		);
	}
}

export class ResourceV2Builder {
	private readonly definition: ResourceV2Definition;
	private tierConfigured = false;

	constructor(id: string) {
		this.definition = {
			id,
			display: {
				name: '',
				icon: '',
				description: '',
			},
		};
	}

	display(display: ResourceV2Definition['display']) {
		this.definition.display = display;
		return this;
	}

	bounds(bounds: NonNullable<ResourceV2Definition['bounds']>) {
		this.definition.bounds = bounds;
		return this;
	}

	tracking(tracking: NonNullable<ResourceV2Definition['tracking']>) {
		this.definition.tracking = {
			...this.definition.tracking,
			...tracking,
		};
		return this;
	}

	group(groupId: string, order?: number) {
		this.definition.groupId = groupId;
		if (order === undefined) {
			delete this.definition.groupOrder;
		} else {
			this.definition.groupOrder = order;
		}
		return this;
	}

	tierTrack(track: ResourceV2TierTrackDefinition) {
		if (this.tierConfigured) {
			throw new Error(
				'ResourceV2 definitions support only one tierTrack. Remove duplicate tier configuration.',
			);
		}
		this.definition.tierTrack = track;
		this.tierConfigured = true;
		return this;
	}

	build(): ResourceV2Definition {
		return { ...this.definition };
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly track: ResourceV2TierTrackDefinition;
	private readonly seenSteps = new Set<string>();

	constructor(id: string) {
		this.track = { id, steps: [] };
	}

	displayName(displayName: string) {
		this.track.displayName = displayName;
		return this;
	}

	step(step: ResourceV2TierStepDefinition) {
		if (this.seenSteps.has(step.id)) {
			throw new Error(
				`Tier track "${this.track.id}" already defines a step with id "${step.id}".`,
			);
		}
		this.track.steps.push(step);
		this.seenSteps.add(step.id);
		return this;
	}

	build(): ResourceV2TierTrackDefinition {
		return {
			...this.track,
			steps: [...this.track.steps],
		};
	}
}

export class ResourceV2GroupBuilder {
	private readonly group: ResourceV2GroupDefinition;
	private parentConfigured = false;

	constructor(id: string) {
		this.group = { id };
	}

	order(order: number) {
		this.group.order = order;
		return this;
	}

	parent(parent: NonNullable<ResourceV2GroupDefinition['parent']>) {
		if (this.parentConfigured) {
			throw new Error(
				'ResourceV2 groups may define only one virtual parent. Remove duplicate parent() calls.',
			);
		}
		this.group.parent = parent;
		this.parentConfigured = true;
		return this;
	}

	build(): ResourceV2GroupDefinition {
		return { ...this.group };
	}
}

export function resourceV2(id: string) {
	return new ResourceV2Builder(id);
}

export function resourceV2TierTrack(id: string) {
	return new ResourceV2TierTrackBuilder(id);
}

export function resourceV2Group(id: string) {
	return new ResourceV2GroupBuilder(id);
}

export function resourceV2Add(
	resourceId: string,
	amount: number,
	options: ResourceV2ValueEffectOptions = {},
): ResourceV2EffectDefinition {
	guardVirtualParent(options.target);
	const effect: ResourceV2EffectDefinition = {
		type: 'resourceV2',
		method: 'add',
		params: {
			resourceId,
			amount,
		},
		reconciliation: ensureClamp(options.reconciliation, 'resourceV2Add'),
	};
	if (options.round) {
		effect.round = options.round;
	}
	return applyHookSuppression(effect, options.suppressHooks);
}

export function resourceV2Remove(
	resourceId: string,
	amount: number,
	options: ResourceV2ValueEffectOptions = {},
): ResourceV2EffectDefinition {
	guardVirtualParent(options.target);
	const effect: ResourceV2EffectDefinition = {
		type: 'resourceV2',
		method: 'remove',
		params: {
			resourceId,
			amount,
		},
		reconciliation: ensureClamp(options.reconciliation, 'resourceV2Remove'),
	};
	if (options.round) {
		effect.round = options.round;
	}
	return applyHookSuppression(effect, options.suppressHooks);
}

export function resourceV2Transfer(
	fromId: string,
	toId: string,
	amount: number,
	options: ResourceV2TransferEffectOptions = {},
): ResourceV2EffectDefinition {
	const donor = ensureClamp(
		options.donorReconciliation,
		'resourceV2Transfer donor',
	);
	const recipient = ensureClamp(
		options.recipientReconciliation,
		'resourceV2Transfer recipient',
	);
	const effect: ResourceV2EffectDefinition = {
		type: 'resourceV2',
		method: 'transfer',
		params: {
			fromId,
			toId,
			amount,
			donorReconciliation: donor,
			recipientReconciliation: recipient,
		},
	};
	return applyHookSuppression(effect, options.suppressHooks);
}

export function resourceV2LowerBoundIncrease(
	resourceId: string,
	amount: number,
	options: ResourceV2BoundEffectOptions = {},
): ResourceV2EffectDefinition {
	const reconciliation = ensureClamp(
		options.reconciliation,
		'resourceV2LowerBoundIncrease',
	);
	return {
		type: 'resourceV2',
		method: 'lowerBoundIncrease',
		params: {
			resourceId,
			amount,
		},
		reconciliation,
	};
}

export function resourceV2LowerBoundDecrease() {
	throw new Error(
		'resourceV2LowerBoundDecrease is unavailable during the clamp-only MVP. Configure tier consequences instead.',
	);
}

export function resourceV2UpperBoundIncrease(
	resourceId: string,
	amount: number,
	options: ResourceV2BoundEffectOptions = {},
): ResourceV2EffectDefinition {
	const reconciliation = ensureClamp(
		options.reconciliation,
		'resourceV2UpperBoundIncrease',
	);
	return {
		type: 'resourceV2',
		method: 'upperBoundIncrease',
		params: {
			resourceId,
			amount,
		},
		reconciliation,
	};
}

export function resourceV2UpperBoundDecrease() {
	throw new Error(
		'resourceV2UpperBoundDecrease is unavailable during the clamp-only MVP. Configure tier consequences instead.',
	);
}
