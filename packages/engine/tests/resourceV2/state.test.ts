import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';

import {
	adjustResourceValue,
	clearResourceTouches,
	createResourceV2Metadata,
	createResourceV2State,
	getResourceValue,
	isLimitedResource,
	isResourceTouched,
	markResourceUntouched,
	setResourceValue,
	type ResourceV2State,
	type ResourceV2Metadata,
} from '../../src/resourceV2';

function setupState(): {
	state: ResourceV2State;
	metadata: ResourceV2Metadata;
	parentId: string;
	fireId: string;
	waterId: string;
} {
	const factory = createContentFactory();
	const group = factory.resourceGroup({
		id: 'elemental',
		parentId: 'elemental-total',
		parentLabel: 'Elemental Focus',
		parentDescription: 'Aggregate elemental attunement.',
	});

	const fire = factory.resourceDefinition({
		id: 'fire',
		configure: (builder) => {
			builder.lowerBound(0).upperBound(10).group(group.id, 1);
		},
	});

	const water = factory.resourceDefinition({
		id: 'water',
		configure: (builder) => {
			builder.lowerBound(0).upperBound(15).group(group.id, 2);
		},
	});

	const metadata = createResourceV2Metadata({
		definitions: factory.resourceDefinitions,
		groups: factory.resourceGroups,
	});

	const state = createResourceV2State(metadata, {
		values: {
			[fire.id]: 3,
			[water.id]: 7,
		},
	});

	return {
		state,
		metadata,
		parentId: group.parent.id,
		fireId: fire.id,
		waterId: water.id,
	};
}

describe('ResourceV2 state', () => {
	it('initialises values and aggregates limited parents', () => {
		const { state, parentId, fireId, waterId, metadata } = setupState();

		expect(getResourceValue(state, fireId)).toBe(3);
		expect(getResourceValue(state, waterId)).toBe(7);

		expect(isResourceTouched(state, fireId)).toBe(false);
		expect(isResourceTouched(state, waterId)).toBe(false);

		expect(getResourceValue(state, parentId)).toBe(10);
		expect(isResourceTouched(state, parentId)).toBe(false);
		expect(isLimitedResource(state, parentId)).toBe(true);

		const childIds = metadata.parentToChildren.get(parentId) ?? [];
		const childTotal = childIds.reduce(
			(sum, id) => sum + getResourceValue(state, id),
			0,
		);
		expect(childTotal).toBe(getResourceValue(state, parentId));
	});

	it('tracks touched state for children and parents', () => {
		const { state, parentId, fireId, waterId } = setupState();

		setResourceValue(state, fireId, 6);
		expect(getResourceValue(state, fireId)).toBe(6);
		expect(isResourceTouched(state, fireId)).toBe(true);
		expect(isResourceTouched(state, parentId)).toBe(true);
		expect(getResourceValue(state, parentId)).toBe(13);

		markResourceUntouched(state, fireId);
		expect(isResourceTouched(state, fireId)).toBe(false);

		adjustResourceValue(state, waterId, 2);
		expect(getResourceValue(state, waterId)).toBe(9);
		expect(isResourceTouched(state, waterId)).toBe(true);
		expect(isResourceTouched(state, parentId)).toBe(true);

		clearResourceTouches(state);
		expect(isResourceTouched(state, fireId)).toBe(false);
		expect(isResourceTouched(state, waterId)).toBe(false);
		expect(isResourceTouched(state, parentId)).toBe(false);
	});

	it('enforces clamp behaviour and prevents direct parent mutations', () => {
		const { state, parentId, fireId, waterId, metadata } = setupState();

		expect(() => setResourceValue(state, parentId, 99)).toThrowError(
			/limited ResourceV2 parent/,
		);

		setResourceValue(state, fireId, 50);
		expect(getResourceValue(state, fireId)).toBe(10);

		setResourceValue(state, waterId, -5);
		expect(getResourceValue(state, waterId)).toBe(0);

		const childIds = metadata.parentToChildren.get(parentId) ?? [];
		const total = childIds.reduce(
			(sum, id) => sum + getResourceValue(state, id),
			0,
		);
		expect(getResourceValue(state, parentId)).toBe(total);
		expect(isResourceTouched(state, parentId)).toBe(true);
	});
});
