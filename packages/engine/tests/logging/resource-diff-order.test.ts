import { describe, it, expect } from 'vitest';
import { snapshotPlayer } from '../../src/log.ts';
import { diffPlayerSnapshots } from '../../src/effects/attack/snapshot_diff.ts';
import { runEffects } from '../../src/effects/index.ts';
import { createEngine } from '../../src/index.ts';
import { PHASES, RULES } from '@kingdom-builder/contents';
import type { StartConfig } from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';

describe('Player snapshot diffs', () => {
	it('orders parent and child values using ResourceV2 metadata', () => {
		const content = createContentFactory();
		const wealthGroup = content.resourceGroup({
			id: 'wealth',
			parentId: 'wealth_parent',
			parentOrder: 0,
			parentLabel: 'Wealth',
		});
		const gold = content.resourceDefinition({
			id: 'wealth_gold',
			order: 1,
			configure: (builder) => builder.lowerBound(0).group(wealthGroup.id, 1),
		});
		const gems = content.resourceDefinition({
			id: 'wealth_gems',
			order: 2,
			configure: (builder) => builder.lowerBound(0).group(wealthGroup.id, 2),
		});
		const start: StartConfig = {
			player: {
				resources: {
					[gold.id]: 0,
					[gems.id]: 0,
				},
				stats: {},
				population: {},
			},
			players: {},
		};
		const engine = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: PHASES,
			start,
			rules: { ...RULES },
			resourceDefinitions: content.resourceDefinitions.values(),
			resourceGroups: content.resourceGroups.values(),
		});
		const before = snapshotPlayer(engine.activePlayer, engine);
		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: gold.id, amount: 2 },
				},
				{
					type: 'resource',
					method: 'add',
					params: { key: gems.id, amount: 1 },
				},
			],
			engine,
		);
		const after = snapshotPlayer(engine.activePlayer, engine);
		const diffs = diffPlayerSnapshots(before, after);
		expect(diffs).toHaveLength(3);
		expect(diffs[0]).toMatchObject({
			type: 'resource',
			key: wealthGroup.parent.id,
			before: 0,
			after: 3,
		});
		expect(diffs[1]).toMatchObject({
			type: 'resource',
			key: gold.id,
			before: 0,
			after: 2,
		});
		expect(diffs[2]).toMatchObject({
			type: 'resource',
			key: gems.id,
			before: 0,
			after: 1,
		});
	});
});
