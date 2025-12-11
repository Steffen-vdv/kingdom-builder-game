import { describe, it, expect } from 'vitest';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import {
	resolveResourceSourceMeta,
	applyResourceDelta,
	withResourceSourceFrames,
	collectEvaluatorDependencies,
	recordEffectResourceDelta,
	registerEvaluatorDependencyCollector,
	evaluatorDependencyCollectorRegistry,
} from '../src/resource_sources.ts';
import type { EffectDef } from '../src/effects/index.ts';
import type { EvaluatorDependencyCollector } from '../src/resource_sources.ts';

describe('resource sources metadata', () => {
	it('merges frame metadata with effect overrides when recording deltas', () => {
		const engineContext = createTestEngine();
		const player = engineContext.activePlayer;
		const firstPhase = engineContext.phases[0];
		const firstStep = firstPhase?.steps[0];
		expect(firstPhase).toBeDefined();
		expect(firstStep).toBeDefined();

		const frame = () => ({
			resourceId: 'frame-source',
			longevity: 'ongoing' as const,
			kind: 'resource',
			dependsOn: [
				{
					type: 'resource',
					id: PopulationRole.Legion,
					detail: 'assigned',
					extra: { extraField: 'keep' },
				},
			],
			extra: { frameTag: 'alpha' },
		});

		const effect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: Stat.armyStrength,
				change: { type: 'amount', amount: 2 },
			},
			meta: {
				resourceSource: {
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

		const meta = withResourceSourceFrames(engineContext, frame, () =>
			resolveResourceSourceMeta(effect, engineContext, Stat.armyStrength),
		);

		expect(meta).toMatchObject({
			sourceKey: 'custom-source',
			longevity: 'ongoing',
			kind: 'resource',
			id: PopulationRole.Legion,
			detail: 'Passive bonus',
			instance: '7',
			effect: { type: 'resource', method: 'add' },
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
					type: 'resource',
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

		// Stat values ARE Resource IDs directly - no mapper needed
		applyResourceDelta(player, Stat.armyStrength, 2, meta);
		const initialEntry =
			player.resourceSources[Stat.armyStrength]?.[meta.sourceKey];
		expect(initialEntry?.amount).toBe(2);
		expect(initialEntry?.meta.longevity).toBe('ongoing');

		const updateMeta = withResourceSourceFrames(
			engineContext,
			() => ({
				dependsOn: [{ type: 'resource', id: Stat.growth }],
				extra: { updateTag: 'gamma' },
			}),
			() =>
				resolveResourceSourceMeta(
					{
						...effect,
						meta: {
							resourceSource: {
								key: meta.sourceKey,
								longevity: 'permanent',
								dependsOn: [
									{
										type: 'resource',
										id: PopulationRole.Legion,
										detail: 'assigned',
									},
								],
							},
						},
					},
					engineContext,
					Stat.armyStrength,
				),
		);

		applyResourceDelta(player, Stat.armyStrength, 1, updateMeta);
		const merged = player.resourceSources[Stat.armyStrength]?.[meta.sourceKey];
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
					type: 'resource',
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
				{ type: 'resource', id: Stat.growth },
			]),
		);

		applyResourceDelta(player, Stat.armyStrength, -3, updateMeta);
		expect(
			player.resourceSources[Stat.armyStrength]?.[meta.sourceKey],
		).toBeUndefined();
	});

	it('records evaluator dependencies and percent-based resource deltas', () => {
		const engineContext = createTestEngine();
		const player = engineContext.activePlayer;
		const developmentId = engineContext.developments.keys()[0];
		expect(developmentId).toBeDefined();

		// Use resource evaluator for all resource types (stats, population, etc.)
		const dependencies = collectEvaluatorDependencies({
			type: 'compare',
			params: {
				left: {
					type: 'resource',
					params: { resourceId: PopulationRole.Legion },
				},
				right: {
					type: 'compare',
					params: {
						left: { type: 'development', params: { id: developmentId } },
						right: { type: 'resource', params: { resourceId: Stat.growth } },
					},
				},
			},
		});
		expect(dependencies).toEqual(
			expect.arrayContaining([
				{ type: 'resource', id: PopulationRole.Legion },
				{ type: 'development', id: developmentId },
				{ type: 'resource', id: Stat.growth },
			]),
		);

		const pctEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: Stat.armyStrength,
				change: {
					type: 'percentFromResource',
					sourceResourceId: Stat.growth,
				},
			},
		};
		// Stat values ARE Resource IDs directly - no mapper needed
		recordEffectResourceDelta(pctEffect, engineContext, Stat.armyStrength, 1);
		const pctEntry = Object.values(
			player.resourceSources[Stat.armyStrength] ?? {},
		).find((entry) => entry.meta.effect?.method === 'add');
		expect(pctEntry?.meta.dependsOn).toEqual(
			expect.arrayContaining([
				{
					type: 'resource',
					id: Stat.growth,
				},
			]),
		);
	});

	it('allows overriding evaluator dependency collectors via the registry', () => {
		const originalCollector =
			evaluatorDependencyCollectorRegistry.get('resource');
		const customCollector: EvaluatorDependencyCollector = () => [
			{ type: 'resource', id: Stat.armyStrength },
		];

		registerEvaluatorDependencyCollector('resource', customCollector);

		try {
			const dependencies = collectEvaluatorDependencies({
				type: 'resource',
				params: { resourceId: Stat.growth },
			});

			expect(dependencies).toEqual([
				{ type: 'resource', id: Stat.armyStrength },
			]);
		} finally {
			if (originalCollector) {
				registerEvaluatorDependencyCollector('resource', originalCollector);
			} else {
				evaluatorDependencyCollectorRegistry.delete('resource');
			}
		}
	});
});
