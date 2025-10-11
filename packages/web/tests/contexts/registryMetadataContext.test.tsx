import React from 'react';
import { renderHook } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { RESOURCES } from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import {
	RegistryMetadataProvider,
	useRegistryMetadata,
} from '../../src/contexts/RegistryMetadataContext';

const jsdom = new JSDOM('<!doctype html><html><body></body></html>');
vi.stubGlobal('window', jsdom.window as unknown as typeof globalThis);
vi.stubGlobal('document', jsdom.window.document);
vi.stubGlobal('navigator', jsdom.window.navigator);

describe('RegistryMetadataProvider', () => {
	it('exposes metadata accessors for session registries', () => {
		const factory = createContentFactory();
		const building = factory.building({ name: 'Test Forge' });
		const development = factory.development({ name: 'Test Orchard' });
		const population = factory.population({ name: 'Test Guild' });
		const [resourceKey] = Object.keys(RESOURCES);
		if (!resourceKey) {
			throw new Error('Expected at least one resource definition');
		}
		const resourceInfo = RESOURCES[resourceKey];
		const resourceDefinition: SessionResourceDefinition = { key: resourceKey };
		if (resourceInfo.icon) {
			resourceDefinition.icon = resourceInfo.icon;
		}
		if (resourceInfo.label) {
			resourceDefinition.label = resourceInfo.label;
		}
		if (resourceInfo.description) {
			resourceDefinition.description = resourceInfo.description;
		}
		if (resourceInfo.tags && resourceInfo.tags.length > 0) {
			resourceDefinition.tags = [...resourceInfo.tags];
		}
		const registries = {
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			resources: { [resourceKey]: resourceDefinition },
		};
		const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
			<RegistryMetadataProvider registries={registries}>
				{children}
			</RegistryMetadataProvider>
		);
		const { result } = renderHook(() => useRegistryMetadata(), { wrapper });
		const buildingDefinition = result.current.buildings.require(building.id);
		const developmentDefinition = result.current.developments.require(
			development.id,
		);
		const populationDefinition = result.current.populations.require(
			population.id,
		);
		const resourceEntry = result.current.resources.require(resourceKey);
		expect(buildingDefinition.name).toBe(building.name);
		expect(developmentDefinition.name).toBe(development.name);
		expect(populationDefinition.name).toBe(population.name);
		expect(resourceEntry.label).toBe(resourceDefinition.label);
		const buildingIds = result.current.buildings.keys();
		expect(buildingIds).toContain(building.id);
		const resourceKeys = result.current.resources.keys();
		expect(resourceKeys).toContain(resourceKey);
	});
});
