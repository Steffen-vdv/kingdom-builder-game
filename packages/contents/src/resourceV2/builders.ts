import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2TierStepDefinition,
	ResourceV2TierTrackDefinition,
	ResourceV2VirtualParentMetadata,
} from './types';

function assertAssigned(flag: boolean, message: string) {
	if (flag) {
		throw new Error(message);
	}
}

function assertPresent(value: string | undefined, message: string) {
	if (!value) {
		throw new Error(message);
	}
}

export class ResourceV2Builder {
	private readonly definition: Partial<ResourceV2Definition> = {};
	private idAssigned = false;
	private nameAssigned = false;
	private tierTrackAssigned = false;

	private set<K extends keyof ResourceV2Definition>(
		key: K,
		value: ResourceV2Definition[K],
	) {
		this.definition[key] = value;
		return this;
	}

	id(id: string) {
		assertAssigned(
			this.idAssigned,
			'ResourceV2 already configured id(). Remove the duplicate call.',
		);
		this.definition.id = id;
		this.idAssigned = true;
		return this;
	}

	name(name: string) {
		assertAssigned(
			this.nameAssigned,
			'ResourceV2 already configured name(). Remove the duplicate call.',
		);
		this.definition.name = name;
		this.nameAssigned = true;
		return this;
	}

	icon(icon: string) {
		return this.set('icon', icon);
	}

	description(description: string) {
		return this.set('description', description);
	}

	order(order: number) {
		return this.set('order', order);
	}

	percent(isPercent = true) {
		return this.set('isPercent', isPercent);
	}

	lowerBound(value: number) {
		return this.set('lowerBound', value);
	}

	upperBound(value: number) {
		return this.set('upperBound', value);
	}

	trackValueBreakdown(flag = true) {
		return this.set('trackValueBreakdown', flag);
	}

	trackBoundBreakdown(flag = true) {
		return this.set('trackBoundBreakdown', flag);
	}

	group(group: ResourceV2GroupMetadata) {
		this.definition.group = group;
		if (group.parent) {
			this.definition.limitedToChildren = true;
		}
		return this;
	}

	limitedToChildren(flag = true) {
		return this.set('limitedToChildren', flag);
	}

	tierTrack(track: ResourceV2TierTrackDefinition) {
		assertAssigned(
			this.tierTrackAssigned,
			'ResourceV2 only supports one tier track. Remove the extra tierTrack() call.',
		);
		this.definition.tierTrack = track;
		this.tierTrackAssigned = true;
		return this;
	}

	build(): ResourceV2Definition {
		assertPresent(
			this.definition.id,
			'ResourceV2 requires id() before build().',
		);
		assertPresent(
			this.definition.name,
			'ResourceV2 requires name() before build().',
		);
		return this.definition as ResourceV2Definition;
	}
}

export class ResourceV2VirtualParentBuilder {
	private readonly metadata: Partial<ResourceV2VirtualParentMetadata> = {};
	private idAssigned = false;
	private nameAssigned = false;

	private set<K extends keyof ResourceV2VirtualParentMetadata>(
		key: K,
		value: ResourceV2VirtualParentMetadata[K],
	) {
		this.metadata[key] = value;
		return this;
	}

	id(id: string) {
		assertAssigned(
			this.idAssigned,
			'ResourceV2 virtual parents only accept one id().',
		);
		this.metadata.id = id;
		this.idAssigned = true;
		return this;
	}

	name(name: string) {
		assertAssigned(
			this.nameAssigned,
			'ResourceV2 virtual parents only accept one name().',
		);
		this.metadata.name = name;
		this.nameAssigned = true;
		return this;
	}

	icon(icon: string) {
		return this.set('icon', icon);
	}

	description(description: string) {
		return this.set('description', description);
	}

	order(order: number) {
		return this.set('order', order);
	}

	build(): ResourceV2VirtualParentMetadata {
		assertPresent(this.metadata.id, 'ResourceV2VirtualParent requires id().');
		assertPresent(
			this.metadata.name,
			'ResourceV2VirtualParent requires name().',
		);
		return this.metadata as ResourceV2VirtualParentMetadata;
	}
}

export class ResourceV2TierTrackBuilder {
	private readonly track: Partial<ResourceV2TierTrackDefinition> = {};
	private readonly steps: ResourceV2TierStepDefinition[] = [];
	private readonly stepIds = new Set<string>();
	private idAssigned = false;
	private nameAssigned = false;

	private set<K extends keyof ResourceV2TierTrackDefinition>(
		key: K,
		value: ResourceV2TierTrackDefinition[K],
	) {
		this.track[key] = value;
		return this;
	}

	id(id: string) {
		assertAssigned(
			this.idAssigned,
			'ResourceV2 tier tracks already configured id().',
		);
		this.track.id = id;
		this.idAssigned = true;
		return this;
	}

	name(name: string) {
		assertAssigned(
			this.nameAssigned,
			'ResourceV2 tier tracks already configured name().',
		);
		this.track.name = name;
		this.nameAssigned = true;
		return this;
	}

	summaryToken(token: string) {
		return this.set('summaryToken', token);
	}

	step(step: ResourceV2TierStepDefinition) {
		if (this.stepIds.has(step.id)) {
			throw new Error('ResourceV2 tier tracks require unique step ids.');
		}
		this.stepIds.add(step.id);
		this.steps.push(step);
		return this;
	}

	build(): ResourceV2TierTrackDefinition {
		assertPresent(this.track.id, 'ResourceV2TierTrack requires id().');
		assertPresent(this.track.name, 'ResourceV2TierTrack requires name().');
		if (this.steps.length === 0) {
			throw new Error('ResourceV2 tier tracks require at least one step.');
		}
		return {
			...this.track,
			steps: [...this.steps],
		} as ResourceV2TierTrackDefinition;
	}
}

export const createResourceV2Builder = () => new ResourceV2Builder();
export const createResourceV2VirtualParentBuilder = () =>
	new ResourceV2VirtualParentBuilder();
export const createResourceV2TierTrackBuilder = () =>
	new ResourceV2TierTrackBuilder();
export const createResourceV2GroupMetadata = (
	groupId: string,
	parent: ResourceV2VirtualParentMetadata,
	order?: number,
): ResourceV2GroupMetadata => {
	const metadata: ResourceV2GroupMetadata = { groupId, parent };
	if (order !== undefined) {
		metadata.order = order;
	}
	return metadata;
};

export {
	adjustResourceV2LowerBound,
	adjustResourceV2UpperBound,
	flatDelta,
	percentDelta,
	resourceV2Add,
	resourceV2Remove,
	resourceV2Transfer,
} from './mutations';

export {
	ResourceV2PercentRoundingMode,
	ResourceV2Reconciliation,
} from './types';
