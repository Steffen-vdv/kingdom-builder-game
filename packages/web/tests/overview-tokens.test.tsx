/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { buildOverviewIconSet } from '../src/components/overview/overviewTokens';
import { createOverviewTokenSources } from '../src/components/overview/overviewTokenUtils';
import {
	RegistryMetadataProvider,
	useRegistryMetadata,
} from '../src/contexts/RegistryMetadataContext';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { OverviewTokenConfig } from '../src/components/overview/overviewTokens';

describe('buildOverviewIconSet', () => {
	const factory = createContentFactory();
	const expandAction = factory.action({ id: 'expand', icon: '🚀' });
	const developAction = factory.action({ id: 'develop', icon: '🏗️' });
	const councilRole = factory.population({ id: 'council', icon: '👑' });
	const legionRole = factory.population({ id: 'legion', icon: '🛡️' });
	const registries: SessionRegistries = {
		actions: factory.actions,
		actionCategories: factory.categories,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		resources: {
			gold: { key: 'gold', label: 'Gold', icon: '🥇' },
			ap: { key: 'ap', label: 'AP', icon: '⚡' },
		},
	};
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {
			gold: { label: 'Refined Gold', icon: '🪙' },
			ap: { label: 'Reserve AP', icon: '✨' },
		},
		populations: {
			[councilRole.id]: { label: 'Guiding Council', icon: councilRole.icon },
			[legionRole.id]: { label: 'Legion Vanguard', icon: legionRole.icon },
		},
		buildings: {},
		developments: {},
		stats: {
			army: { label: 'Army Strength', icon: '🛡️' },
			fortification: { label: 'Fortification', icon: '🧱' },
		},
		phases: {
			growth: { label: 'Growth', icon: '🌱', action: false, steps: [] },
			upkeep: { label: 'Upkeep', icon: '🧹', action: false, steps: [] },
		},
		triggers: {},
		assets: {
			land: { label: 'Land', icon: '🗺️' },
			slot: { label: 'Slot', icon: '🧩' },
			passive: { label: 'Passive', icon: '✨' },
		},
		overviewContent: {
			hero: { title: 'Overview Tokens', tokens: {} },
			sections: [],
			tokens: {},
		},
	};

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<RegistryMetadataProvider registries={registries} metadata={metadata}>
			{children}
		</RegistryMetadataProvider>
	);

	const useIconSet = (overrides?: OverviewTokenConfig) => {
		const {
			actions,
			phaseMetadata,
			resourceMetadata,
			statMetadata,
			populationMetadata,
			landMetadata,
			slotMetadata,
		} = useRegistryMetadata();
		const sources = React.useMemo(
			() =>
				createOverviewTokenSources({
					actions,
					phaseMetadata,
					resourceMetadata,
					statMetadata,
					populationMetadata,
					landMetadata,
					slotMetadata,
				}),
			[
				actions,
				phaseMetadata,
				resourceMetadata,
				statMetadata,
				populationMetadata,
				landMetadata,
				slotMetadata,
			],
		);
		return buildOverviewIconSet(sources, overrides);
	};

	it('includes icons for ids provided by registry metadata', () => {
		const { result } = renderHook(() => useIconSet(), { wrapper });
		const icons = result.current;

		expect(icons.expand).toBe(expandAction.icon);
		expect(icons.develop).toBe(developAction.icon);
		expect(icons.growth).toBe('🌱');
		expect(icons.upkeep).toBe('🧹');
		expect(icons.gold).toBe('🪙');
		expect(icons.ap).toBe('✨');
		expect(icons.army).toBe('🛡️');
		expect(icons.fortification).toBe('🧱');
		expect(icons.council).toBe(councilRole.icon);
		expect(icons.legion).toBe(legionRole.icon);
		expect(icons.land).toBe('🗺️');
		expect(icons.slot).toBe('🧩');
	});

	it('allows custom token keys to reference registry identifiers', () => {
		const { result, rerender } = renderHook(
			({ overrides }: { overrides?: OverviewTokenConfig }) =>
				useIconSet(overrides),
			{ wrapper, initialProps: { overrides: undefined } },
		);

		expect(result.current.alias_expand).toBeUndefined();

		rerender({
			overrides: {
				actions: {
					alias_expand: expandAction.id,
				},
			},
		});

		expect(result.current.alias_expand).toBe(expandAction.icon);
	});
});
