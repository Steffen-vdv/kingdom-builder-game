import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { buildOverviewIconSet } from '../src/components/overview/overviewTokens';
import {
	createOverviewTokenCategories,
	type OverviewTokenCategoryResolver,
} from '../src/components/overview/overviewTokenUtils';
import {
	RegistryMetadataProvider,
	useRegistryMetadata,
} from '../src/contexts/RegistryMetadataContext';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';

const CATEGORY_CAPTURE_ERROR =
	'Expected overview token categories to be captured.';

const factory = createContentFactory();
factory.action({ id: 'expand', icon: '🚀', name: 'Expand' });
factory.action({ id: 'develop', icon: '🛠️', name: 'Develop' });
factory.population({ id: 'council', icon: '👑', name: 'Council' });
factory.population({ id: 'legion', name: 'Legion' });

const registries: SessionRegistries = {
	actions: factory.actions,
	buildings: factory.buildings,
	developments: factory.developments,
	populations: factory.populations,
	resources: {
		gold: { key: 'gold', icon: '💰', label: 'Gold' },
		ap: { key: 'ap', icon: '⚡', label: 'Action Points' },
	},
};

const metadata: SessionSnapshotMetadata = {
	passiveEvaluationModifiers: {},
	actions: {
		expand: { label: 'Expand', icon: '🚀' },
		develop: { label: 'Develop', icon: '🛠️' },
	},
	resources: {
		gold: { label: 'Gold', icon: '💰' },
		ap: { label: 'Action Points', icon: '⚡' },
	},
	populations: {
		council: { label: 'Council', icon: '👑' },
		legion: { label: 'Legion' },
	},
	stats: {
		army: { label: 'Army', icon: '🛡️' },
	},
	phases: {
		growth: { label: 'Growth', icon: '🌱', action: true, steps: [] },
		upkeep: { label: 'Upkeep', action: false, steps: [] },
	},
	assets: {
		land: { label: 'Land', icon: '🗺️' },
		slot: { label: 'Slot', icon: '📦' },
	},
};

function captureCategories(): ReadonlyArray<OverviewTokenCategoryResolver> {
	let captured: ReadonlyArray<OverviewTokenCategoryResolver> | null = null;
	const Capture = () => {
		const registryMetadata = useRegistryMetadata();
		captured = createOverviewTokenCategories(registryMetadata);
		return null;
	};
	renderToStaticMarkup(
		React.createElement(
			RegistryMetadataProvider,
			{ registries, metadata },
			React.createElement(Capture),
		),
	);
	if (!captured) {
		throw new Error(CATEGORY_CAPTURE_ERROR);
	}
	return captured;
}

describe('buildOverviewIconSet', () => {
	it('includes icons for ids provided by metadata registries', () => {
		const categories = captureCategories();
		const icons = buildOverviewIconSet(undefined, categories);

		expect(icons.expand).toBe('🚀');
		expect(icons.develop).toBe('🛠️');
		expect(icons.growth).toBe('🌱');
		expect(icons.gold).toBe('💰');
		expect(icons.ap).toBe('⚡');
		expect(icons.army).toBe('🛡️');
		expect(icons.council).toBe('👑');
		expect(icons.land).toBe('🗺️');
		expect(icons.slot).toBe('📦');
		expect(icons.legion).toBeUndefined();
	});

	it('allows custom token keys to reference registry identifiers', () => {
		const categories = captureCategories();
		const alias = 'alias_expand';
		const icons = buildOverviewIconSet(
			{
				actions: {
					[alias]: 'expand',
				},
			},
			categories,
		);
		expect(icons[alias]).toBe('🚀');
	});
});
