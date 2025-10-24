import type { ResourceV2Definition, ResourceV2GroupMetadata } from '@kingdom-builder/protocol';

export interface ResourceV2MigrationScaffold {
	readonly definitions: ReadonlyArray<ResourceV2Definition>;
	readonly groups: ReadonlyArray<ResourceV2GroupMetadata>;
}

type MetadataRecord = Record<string, unknown>;

export interface OrderAllocator {
	readonly peek: () => number;
	readonly next: () => number;
	readonly reserve: (order: number) => number;
}

export function createOrderAllocator(start = 0): OrderAllocator {
	let cursor = start;

	return Object.freeze({
		peek: () => cursor,
		next: () => {
			const order = cursor;
			cursor += 1;
			return order;
		},
		reserve: (order: number) => {
			if (order < cursor) {
				return order;
			}

			cursor = order + 1;
			return order;
		},
	});
}

export function reuseMetadata<TMetadata extends MetadataRecord>(base: TMetadata | undefined, overrides?: Partial<TMetadata>): TMetadata | undefined {
	if (!base && !overrides) {
		return undefined;
	}

	const merged = {
		...(base ?? {}),
		...(overrides ?? {}),
	} as TMetadata;

	return Object.freeze(merged);
}

function freezeArray<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
	return Object.freeze([...values]);
}

export function createMigrationScaffold(definitions: ReadonlyArray<ResourceV2Definition> = [], groups: ReadonlyArray<ResourceV2GroupMetadata> = []): ResourceV2MigrationScaffold {
	return Object.freeze({
		definitions: freezeArray(definitions),
		groups: freezeArray(groups),
	});
}

export const RESOURCE_V2_MIGRATION_SCAFFOLD = createMigrationScaffold();
