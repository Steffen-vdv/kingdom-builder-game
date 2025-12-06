import { describe, it, expect, vi } from 'vitest';
import {
	createSyntheticPlowContent,
	SYNTHETIC_RESOURCES_V2,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_SLOT_INFO,
	SYNTHETIC_PASSIVE_INFO,
	SYNTHETIC_UPKEEP_PHASE,
} from './fixtures/syntheticPlow';
import {
	describeContent,
	splitSummary,
	type Summary,
} from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('plow workshop translation', () => {
	it('includes action card and omits Immediately', () => {
		const synthetic = createSyntheticPlowContent();
		const engine = createEngine({
			actions: synthetic.factory.actions,
			buildings: synthetic.factory.buildings,
			developments: synthetic.factory.developments,
			populations: synthetic.factory.populations,
			phases: synthetic.phases,
			start: synthetic.start,
			rules: synthetic.rules,
			resourceCatalogV2: synthetic.resourceCatalogV2,
		});

		// Create engine snapshot and add V2 resource metadata
		const engineSnapshot = snapshotEngine(engine);
		engineSnapshot.metadata = {
			...engineSnapshot.metadata,
			resourcesV2: SYNTHETIC_RESOURCES_V2,
			populations: {},
			resources: {},
			stats: {},
			assets: {
				land: {
					icon: SYNTHETIC_LAND_INFO.icon,
					label: SYNTHETIC_LAND_INFO.label,
				},
				slot: {
					icon: SYNTHETIC_SLOT_INFO.icon,
					label: SYNTHETIC_SLOT_INFO.label,
				},
				passive: {
					icon: SYNTHETIC_PASSIVE_INFO.icon,
					label: SYNTHETIC_PASSIVE_INFO.label,
				},
				upkeep: {
					icon: SYNTHETIC_UPKEEP_PHASE.icon,
					label: SYNTHETIC_UPKEEP_PHASE.label,
				},
			},
			triggers: {},
		};

		// Create translation context with proper V2 metadata
		const translationContext = createTranslationContext(
			engineSnapshot,
			{
				actions: synthetic.factory.actions,
				actionCategories: synthetic.factory.categories,
				buildings: synthetic.factory.buildings,
				developments: synthetic.factory.developments,
				populations: synthetic.factory.populations,
				resources: {},
			},
			engineSnapshot.metadata,
			{
				ruleSnapshot: engineSnapshot.rules,
				passiveRecords: engineSnapshot.passiveRecords,
			},
		);

		const summary = describeContent(
			'building',
			synthetic.building.id,
			translationContext,
		);
		const { effects, description } = splitSummary(summary);
		expect(effects).toHaveLength(1);
		const build = effects[0] as { title: string; items?: unknown[] };
		expect(build.items?.[0]).toBe(
			`Unlock Action: ${synthetic.plow.icon} ${synthetic.plow.name}`,
		);
		expect(description).toBeDefined();
		const actionCard = (description as Summary)[0] as { title: string };
		expect(actionCard.title).toBe(
			`${synthetic.plow.icon} ${synthetic.plow.name}`,
		);
		expect(JSON.stringify({ effects, description })).not.toMatch(
			/Immediately|🎯/,
		);
	});
});
