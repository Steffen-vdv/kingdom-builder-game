import type {
	ResourceV2BaseDefinition,
	ResourceV2Definition,
	ResourceV2GlobalActionCost,
	ResourceV2GroupParent,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';

import { ResourceV2TierTrackBuilder } from './tier';

abstract class ResourceV2DefinitionBaseBuilder<
	Definition extends
		| ResourceV2BaseDefinition
		| ResourceV2GroupParent
		| ResourceV2Definition,
> {
	protected config: Partial<Definition> = {};
	private readonly assigned = new Set<string>();
	private readonly kind: string;
	private tierTrackSet = false;

	constructor(kind: string, id?: string) {
		this.kind = kind;
		if (id) {
			this.id(id);
		}
	}

	protected set<K extends keyof Definition>(
		key: K,
		value: Definition[K],
		message: string,
	) {
		const keyName = String(key);
		if (this.assigned.has(keyName)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(keyName);
		return this;
	}

	id(id: string) {
		return this.set(
			'id',
			id,
			`${this.kind} already has id(). Remove the extra id() call.`,
		);
	}

	name(name: string) {
		return this.set(
			'name',
			name,
			`${this.kind} already has name(). Remove the extra name() call.`,
		);
	}

	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			`${this.kind} already has icon(). Remove the extra icon() call.`,
		);
	}

	description(description: string) {
		return this.set(
			'description',
			description,
			`${this.kind} already has description(). Remove the extra description() call.`,
		);
	}

	order(order: number) {
		return this.set(
			'order',
			order,
			`${this.kind} already set order(). Remove the duplicate order() call.`,
		);
	}

	percent(flag = true) {
		return this.set(
			'isPercent',
			flag,
			`${this.kind} already set percent(). Remove the duplicate percent() call.`,
		);
	}

	lowerBound(value: number) {
		return this.set(
			'lowerBound',
			value,
			`${this.kind} already set lowerBound(). Remove the duplicate lowerBound() call.`,
		);
	}

	upperBound(value: number) {
		return this.set(
			'upperBound',
			value,
			`${this.kind} already set upperBound(). Remove the duplicate upperBound() call.`,
		);
	}

	trackValueBreakdown(flag = true) {
		return this.set(
			'trackValueBreakdown',
			flag,
			`${this.kind} already set trackValueBreakdown(). Remove the duplicate call.`,
		);
	}

	trackBoundBreakdown(flag = true) {
		return this.set(
			'trackBoundBreakdown',
			flag,
			`${this.kind} already set trackBoundBreakdown(). Remove the duplicate call.`,
		);
	}

	metadata(metadata: Record<string, unknown>) {
		return this.set(
			'metadata',
			{ ...(metadata || {}) },
			`${this.kind} already set metadata(). Remove the duplicate metadata() call.`,
		);
	}

	tierTrack(track: ResourceV2TierTrack | ResourceV2TierTrackBuilder) {
		if (this.tierTrackSet) {
			throw new Error(
				`${this.kind} already configured tierTrack(). Remove the duplicate tierTrack() call.`,
			);
		}
		this.config.tierTrack =
			track instanceof ResourceV2TierTrackBuilder ? track.build() : track;
		this.tierTrackSet = true;
		return this;
	}

	protected finalize(): Definition {
		if (!this.assigned.has('id')) {
			throw new Error(
				`${this.kind} is missing id(). Call id('unique-id') before build().`,
			);
		}
		if (!this.assigned.has('name')) {
			throw new Error(
				`${this.kind} is missing name(). Call name('Readable name') before build().`,
			);
		}
		if (!this.assigned.has('order')) {
			throw new Error(
				`${this.kind} is missing order(). Call order(n) before build().`,
			);
		}
		const lower = this.config.lowerBound;
		const upper = this.config.upperBound;
		if (lower !== undefined && upper !== undefined && upper < lower) {
			throw new Error(
				`${this.kind} upperBound() must be greater than or equal to lowerBound().`,
			);
		}
		return this.config as Definition;
	}
}

// prettier-ignore
export class ResourceV2Builder
        extends ResourceV2DefinitionBaseBuilder<ResourceV2Definition>
{
	private groupSet = false;
	private globalCostSet = false;
	private limitedSet = false;

	constructor(id: string) {
		super('ResourceV2 definition', id);
	}

	group(groupId: string) {
		if (this.groupSet) {
			throw new Error(
				'ResourceV2 definition already set group(). Remove the duplicate group() call.',
			);
		}
		this.config.groupId = groupId;
		this.groupSet = true;
		return this;
	}

	globalActionCost(amount: number) {
		if (amount < 0) {
			throw new Error(
				'ResourceV2 globalActionCost() amount must be non-negative.',
			);
		}
		if (this.globalCostSet) {
			throw new Error(
				'ResourceV2 definition already set globalActionCost(). Remove the duplicate call.',
			);
		}
		this.config.globalActionCost = {
			amount,
		} satisfies ResourceV2GlobalActionCost;
		this.globalCostSet = true;
		return this;
	}

	limited(flag = true) {
		if (this.limitedSet) {
			throw new Error(
				'ResourceV2 definition already set limited(). Remove the duplicate limited() call.',
			);
		}
		this.config.limited = flag;
		this.limitedSet = true;
		return this;
	}

	build(): ResourceV2Definition {
		return super.finalize();
	}
}

// prettier-ignore
export class ResourceV2GroupParentBuilder
        extends ResourceV2DefinitionBaseBuilder<ResourceV2GroupParent>
{
	private relationSet = false;
	private limitedSet = false;

	constructor(id: string) {
		super('ResourceV2 group parent', id);
		this.relation('sumOfAll');
		this.limited();
	}

	relation(relation: 'sumOfAll') {
		if (relation !== 'sumOfAll') {
			throw new Error(
				'ResourceV2 group parents currently only support relation "sumOfAll".',
			);
		}
		if (this.relationSet) {
			throw new Error(
				'ResourceV2 group parent already set relation(). Remove the duplicate call.',
			);
		}
		this.config.relation = relation;
		this.relationSet = true;
		return this;
	}

	limited(flag = true) {
		if (flag === false) {
			throw new Error('ResourceV2 group parents must remain limited().');
		}
		if (this.limitedSet) {
			throw new Error(
				'ResourceV2 group parent already set limited(). Remove the duplicate limited() call.',
			);
		}
		this.config.limited = true;
		this.limitedSet = true;
		return this;
	}

	build(): ResourceV2GroupParent {
		return super.finalize();
	}
}

export { ResourceV2DefinitionBaseBuilder };
