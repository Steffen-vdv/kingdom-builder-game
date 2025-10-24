import { describe, it, expect, vi } from 'vitest';
import { createSyntheticPlowContent } from './fixtures/syntheticPlow';
import {
	describeContent,
	splitSummary,
	type Summary,
} from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import { buildResourceCatalogV2 } from '@kingdom-builder/testing';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('plow workshop translation', () => {
	it('includes action card and omits Immediately', () => {
		const synthetic = createSyntheticPlowContent();
		const resourceCatalogV2 = buildResourceCatalogV2();
		const engineContext = createEngine({
			actions: synthetic.factory.actions,
			buildings: synthetic.factory.buildings,
			developments: synthetic.factory.developments,
			populations: synthetic.factory.populations,
			phases: synthetic.phases,
			start: synthetic.start,
			rules: synthetic.rules,
			resourceCatalogV2,
		});
		const summary = describeContent(
			'building',
			synthetic.building.id,
			engineContext,
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
