import type { PlayerId, PlayerState, ResourceV2Key } from '../state';
import type {
	ResourceV2RuntimeCatalog,
	ResourceV2RuntimeGroupParent,
} from '../resourcesV2';

export interface ParentChangeOptions {
	player: PlayerState;
	childId: ResourceV2Key;
	suppressHooks: boolean;
	emitHook(delta: number, resourceId: ResourceV2Key): void;
	onChange?: (
		resourceId: ResourceV2Key,
		previous: number,
		next: number,
		suppressHooks: boolean,
	) => void;
}

const clamp = (value: number, lower?: number, upper?: number) => {
	let next = value;
	if (lower !== undefined && next < lower) {
		next = lower;
	}
	if (upper !== undefined && next > upper) {
		next = upper;
	}
	return next;
};

export class ResourceV2ParentTracker {
	private defs = new Map<ResourceV2Key, ResourceV2RuntimeGroupParent>();
	private children = new Map<ResourceV2Key, ResourceV2Key[]>();
	private childToParent = new Map<ResourceV2Key, ResourceV2Key>();
	private states = new Map<
		PlayerId,
		Map<ResourceV2Key, { value: number; touched: boolean }>
	>();

	constructor(catalog: ResourceV2RuntimeCatalog | undefined) {
		if (!catalog) {
			return;
		}
		for (const group of Object.values(catalog.groupsById)) {
			const parent = group.parent;
			if (!parent) {
				continue;
			}
			const parentId = parent.id;
			this.defs.set(parentId, parent);
			this.children.set(parentId, [...group.children]);
			for (const child of group.children) {
				this.childToParent.set(child, parentId);
			}
		}
	}

	clone(): ResourceV2ParentTracker {
		const tracker = new ResourceV2ParentTracker(undefined);
		tracker.defs = new Map(this.defs);
		tracker.children = new Map(
			Array.from(this.children.entries()).map(([id, list]) => [id, [...list]]),
		);
		tracker.childToParent = new Map(this.childToParent);
		tracker.states = new Map(
			Array.from(this.states.entries()).map(([playerId, stateMap]) => [
				playerId,
				new Map(
					Array.from(stateMap.entries()).map(([key, state]) => [
						key,
						{ ...state },
					]),
				),
			]),
		);
		return tracker;
	}

	has(resourceId: ResourceV2Key): boolean {
		return this.defs.has(resourceId);
	}

	getValue(player: PlayerState, resourceId: ResourceV2Key): number {
		return this.states.get(player.id)?.get(resourceId)?.value ?? 0;
	}

	handleChange(options: ParentChangeOptions): void {
		const parentId = this.childToParent.get(options.childId);
		if (!parentId) {
			return;
		}
		const parent = this.defs.get(parentId);
		if (!parent) {
			return;
		}
		const states = this.ensureStates(options.player.id);
		const previous = states.get(parentId)?.value ?? 0;
		const total = (this.children.get(parentId) ?? []).reduce(
			(sum, child) => sum + options.player.getResourceV2Value(child),
			0,
		);
		const next = clamp(total, parent.lowerBound, parent.upperBound);
		states.set(parentId, {
			value: next,
			touched: Boolean(states.get(parentId)?.touched || next !== 0),
		});
		if (next === previous) {
			return;
		}
		const delta = next - previous;
		options.player.logResourceV2Gain(parentId, delta, {
			suppressed: options.suppressHooks,
		});
		if (!options.suppressHooks) {
			options.emitHook(delta, parentId);
		}
		options.onChange?.(parentId, previous, next, options.suppressHooks);
	}

	private ensureStates(
		playerId: PlayerId,
	): Map<ResourceV2Key, { value: number; touched: boolean }> {
		let states = this.states.get(playerId);
		if (!states) {
			states = new Map();
			this.states.set(playerId, states);
		}
		return states;
	}
}
