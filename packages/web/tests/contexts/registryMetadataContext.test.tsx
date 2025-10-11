import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	RegistryMetadataProvider,
	useRegistryMetadata,
	type RegistryMetadataContextValue,
} from '../../src/contexts/RegistryMetadataContext';
import { describe, expect, it } from 'vitest';

interface TestSetup {
	registries: SessionRegistries;
	buildingId: string;
	developmentId: string;
	populationId: string;
	resourceKey: string;
	resource: SessionResourceDefinition;
}

let sequence = 0;
const nextKey = (prefix: string) => {
	sequence += 1;
	return `${prefix}_${sequence}`;
};

function createTestSetup(): TestSetup {
	const factory = createContentFactory();
	const building = factory.building({
		name: 'Sky Bastion',
		icon: '🏯',
	});
	const development = factory.development({
		name: 'Celestial Garden',
		icon: '🌿',
	});
	const population = factory.population({
		name: 'Astral Council',
		icon: '✨',
	});
	const resourceKey = nextKey('resource');
	const resource: SessionResourceDefinition = {
		key: resourceKey,
		label: 'Starlight',
		icon: '🌟',
		description: 'Rare energy gathered from the firmament.',
	};
	const registries: SessionRegistries = {
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		resources: { [resourceKey]: resource },
	};
	return {
		registries,
		buildingId: building.id,
		developmentId: development.id,
		populationId: population.id,
		resourceKey,
		resource,
	};
}

describe('RegistryMetadataProvider', () => {
	it('provides memoized metadata lookups for registries', () => {
		const setup = createTestSetup();
		let captured: RegistryMetadataContextValue | null = null;
		const Capture = () => {
			captured = useRegistryMetadata();
			return null;
		};
		renderToStaticMarkup(
			<RegistryMetadataProvider registries={setup.registries}>
				<Capture />
			</RegistryMetadataProvider>,
		);
		if (!captured) {
			throw new Error('Registry metadata context was not captured.');
		}
		const { buildings, developments, populations, resources } = captured;
		expect(buildings.getOrThrow(setup.buildingId).id).toBe(setup.buildingId);
		expect(developments.getOrThrow(setup.developmentId).id).toBe(
			setup.developmentId,
		);
		expect(populations.getOrThrow(setup.populationId).id).toBe(
			setup.populationId,
		);
		expect(resources.getOrThrow(setup.resourceKey)).toEqual(setup.resource);
		expect(buildings.keys()).toContain(setup.buildingId);
		expect(developments.values().map((item) => item.id)).toContain(
			setup.developmentId,
		);
		expect(populations.has(nextKey('population'))).toBe(false);
		const [resourceEntry] = resources.entries();
		expect(resourceEntry).toEqual([setup.resourceKey, setup.resource]);
	});
});
