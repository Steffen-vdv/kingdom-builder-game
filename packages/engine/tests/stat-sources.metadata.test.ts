import { describe, it, expect } from 'vitest';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import {
	resolveStatSourceMeta,
	applyStatDelta,
	withStatSourceFrames,
	collectEvaluatorDependencies,
	recordEffectStatDelta,
	registerEvaluatorDependencyCollector,
	evaluatorDependencyCollectorRegistry,
} from '../src/stat_sources.ts';
import type { EffectDef } from '../src/effects/index.ts';
import type { EvaluatorDependencyCollector } from '../src/stat_sources.ts';

describe('stat sources metadata', () => {
	it('merges frame metadata with effect overrides when recording stat deltas', () => {
		const ctx = createTestEngine();
		const player = ctx.activePlayer;
		const firstPhase = ctx.phases[0];
		const firstStep = firstPhase?.steps[0];
		expect(firstPhase).toBeDefined();
		expect(firstStep).toBeDefined();

		const frame = () => ({
			key: 'frame-source',
			longevity: 'ongoing' as const,
			kind: 'population',
			dependsOn: [
				{
					type: 'population',
					id: PopulationRole.Legion,
					detail: 'assigned',
					extra: { extraField: 'keep' },
				},
			],
			extra: { frameTag: 'alpha' },
		});

		const effect: EffectDef = {
			type: 'stat',
			method: 'add',
			params: { key: Stat.armyStrength, amount: 2 },
			meta: {
				statSource: {
					key: 'custom-source',
					longevity: 'permanent',
					id: PopulationRole.Legion,
					detail: 'Passive bonus',
					instance: 7,
					dependsOn: {
						type: 'phase',
						id: firstPhase?.id,
						detail: firstStep?.id,
						reason: 'phase',
					},
					removal: {
						type: 'phase',
						id: firstPhase?.id,
						detail: firstStep?.id,
						cause: 'cleanup',
					},
					extraTag: 'beta',
				},
			},
		};

		const meta = withStatSourceFrames(ctx, frame, () =>
			resolveStatSourceMeta(effect, ctx, Stat.armyStrength),
		);

		expect(meta).toMatchObject({
			key: 'custom-source',
			longevity: 'ongoing',
			kind: 'population',
			id: PopulationRole.Legion,
			detail: 'Passive bonus',
			instance: '7',
			effect: { type: 'stat', method: 'add' },
		});
		expect(meta.removal).toMatchObject({
			type: 'phase',
			id: firstPhase?.id,
			detail: firstStep?.id,
			extra: { cause: 'cleanup' },
		});
		expect(meta.extra).toEqual({ frameTag: 'alpha', extraTag: 'beta' });
		expect(meta.dependsOn).toEqual(
			expect.arrayContaining([
				{
					type: 'population',
					id: PopulationRole.Legion,
					detail: 'assigned',
					extra: { extraField: 'keep' },
				},
				{
					type: 'phase',
					id: firstPhase?.id,
					detail: firstStep?.id,
					extra: { reason: 'phase' },
				},
			]),
		);

		applyStatDelta(player, Stat.armyStrength, 2, meta);
		const initialEntry = player.statSources[Stat.armyStrength]?.[meta.key];
		expect(initialEntry?.amount).toBe(2);
		expect(initialEntry?.meta.longevity).toBe('ongoing');

		const updateMeta = withStatSourceFrames(
			ctx,
			() => ({
				dependsOn: [{ type: 'stat', id: Stat.growth }],
				extra: { updateTag: 'gamma' },
			}),
			() =>
				resolveStatSourceMeta(
					{
						...effect,
						meta: {
							statSource: {
								key: meta.key,
								longevity: 'permanent',
								dependsOn: [
									{
										type: 'population',
										id: PopulationRole.Legion,
										detail: 'assigned',
									},
								],
							},
						},
					},
					ctx,
					Stat.armyStrength,
				),
		);

		applyStatDelta(player, Stat.armyStrength, 1, updateMeta);
		const merged = player.statSources[Stat.armyStrength]?.[meta.key];
		expect(merged?.amount).toBe(3);
		expect(merged?.meta.longevity).toBe('ongoing');
		expect(merged?.meta.extra).toEqual({
			frameTag: 'alpha',
			extraTag: 'beta',
			updateTag: 'gamma',
		});
		expect(merged?.meta.dependsOn).toEqual(
			expect.arrayContaining([
				{
					type: 'population',
					id: PopulationRole.Legion,
					detail: 'assigned',
					extra: { extraField: 'keep' },
				},
				{
					type: 'phase',
					id: firstPhase?.id,
					detail: firstStep?.id,
					extra: { reason: 'phase' },
				},
				{ type: 'stat', id: Stat.growth },
			]),
		);

		applyStatDelta(player, Stat.armyStrength, -3, updateMeta);
		expect(player.statSources[Stat.armyStrength]?.[meta.key]).toBeUndefined();
	});

	it('records evaluator dependencies and percent-based stat deltas', () => {
		const ctx = createTestEngine();
		const player = ctx.activePlayer;
		const developmentId = ctx.developments.keys()[0];
		expect(developmentId).toBeDefined();

		const dependencies = collectEvaluatorDependencies({
			type: 'compare',
			params: {
				left: { type: 'population', params: { role: PopulationRole.Legion } },
				right: {
					type: 'compare',
					params: {
						left: { type: 'development', params: { id: developmentId } },
						right: { type: 'stat', params: { key: Stat.growth } },
					},
				},
			},
		});
		expect(dependencies).toEqual(
			expect.arrayContaining([
				{ type: 'population', id: PopulationRole.Legion },
				{ type: 'development', id: developmentId },
				{ type: 'stat', id: Stat.growth },
			]),
		);

		const pctEffect: EffectDef = {
			type: 'stat',
			method: 'add_pct',
			params: { key: Stat.armyStrength, percent: 25, percentStat: Stat.growth },
		};
		recordEffectStatDelta(pctEffect, ctx, Stat.armyStrength, 1);
		const pctEntry = Object.values(
			player.statSources[Stat.armyStrength] ?? {},
		).find((entry) => entry.meta.effect?.method === 'add_pct');
		expect(pctEntry?.meta.dependsOn).toEqual(
			expect.arrayContaining([{ type: 'stat', id: Stat.growth }]),
		);
	});

	it('allows overriding evaluator dependency collectors via the registry', () => {
		const originalCollector = evaluatorDependencyCollectorRegistry.get('stat');
		const customCollector: EvaluatorDependencyCollector = () => [
			{ type: 'stat', id: Stat.armyStrength },
		];

		registerEvaluatorDependencyCollector('stat', customCollector);

		try {
			const dependencies = collectEvaluatorDependencies({
				type: 'stat',
				params: { key: Stat.growth },
			});

			expect(dependencies).toEqual([{ type: 'stat', id: Stat.armyStrength }]);
		} finally {
			if (originalCollector) {
				registerEvaluatorDependencyCollector('stat', originalCollector);
			} else {
				evaluatorDependencyCollectorRegistry.delete('stat');
			}
		}
	});
});
