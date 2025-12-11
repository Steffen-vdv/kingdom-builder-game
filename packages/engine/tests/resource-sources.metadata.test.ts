import { describe, it, expect } from 'vitest';
import { Resource } from '@kingdom-builder/contents';
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
					id: Resource.legion,
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
				resourceId: Resource.armyStrength,
				change: { type: 'amount', amount: 2 },
			},
			meta: {
				resourceSource: {
					key: 'custom-source',
					longevity: 'permanent',
					id: Resource.legion,
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
			resolveResourceSourceMeta(effect, engineContext, Resource.armyStrength),
		);

		expect(meta).toMatchObject({
			sourceKey: 'custom-source',
			longevity: 'ongoing',
			kind: 'resource',
			id: Resource.legion,
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
					id: Resource.legion,
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
		applyResourceDelta(player, Resource.armyStrength, 2, meta);
		const initialEntry =
			player.resourceSources[Resource.armyStrength]?.[meta.sourceKey];
		expect(initialEntry?.amount).toBe(2);
		expect(initialEntry?.meta.longevity).toBe('ongoing');

		const updateMeta = withResourceSourceFrames(
			engineContext,
			() => ({
				dependsOn: [{ type: 'resource', id: Resource.growth }],
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
										id: Resource.legion,
										detail: 'assigned',
									},
								],
							},
						},
					},
					engineContext,
					Resource.armyStrength,
				),
		);

		applyResourceDelta(player, Resource.armyStrength, 1, updateMeta);
		const merged =
			player.resourceSources[Resource.armyStrength]?.[meta.sourceKey];
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
					id: Resource.legion,
					detail: 'assigned',
					extra: { extraField: 'keep' },
				},
				{
					type: 'phase',
					id: firstPhase?.id,
					detail: firstStep?.id,
					extra: { reason: 'phase' },
				},
				{ type: 'resource', id: Resource.growth },
			]),
		);

		applyResourceDelta(player, Resource.armyStrength, -3, updateMeta);
		expect(
			player.resourceSources[Resource.armyStrength]?.[meta.sourceKey],
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
					params: { resourceId: Resource.legion },
				},
				right: {
					type: 'compare',
					params: {
						left: { type: 'development', params: { id: developmentId } },
						right: {
							type: 'resource',
							params: { resourceId: Resource.growth },
						},
					},
				},
			},
		});
		expect(dependencies).toEqual(
			expect.arrayContaining([
				{ type: 'resource', id: Resource.legion },
				{ type: 'development', id: developmentId },
				{ type: 'resource', id: Resource.growth },
			]),
		);

		const pctEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: Resource.armyStrength,
				change: {
					type: 'percentFromResource',
					sourceResourceId: Resource.growth,
				},
			},
		};
		// Stat values ARE Resource IDs directly - no mapper needed
		recordEffectResourceDelta(
			pctEffect,
			engineContext,
			Resource.armyStrength,
			1,
		);
		const pctEntry = Object.values(
			player.resourceSources[Resource.armyStrength] ?? {},
		).find((entry) => entry.meta.effect?.method === 'add');
		expect(pctEntry?.meta.dependsOn).toEqual(
			expect.arrayContaining([
				{
					type: 'resource',
					id: Resource.growth,
				},
			]),
		);
	});

	it('allows overriding evaluator dependency collectors via the registry', () => {
		const originalCollector =
			evaluatorDependencyCollectorRegistry.get('resource');
		const customCollector: EvaluatorDependencyCollector = () => [
			{ type: 'resource', id: Resource.armyStrength },
		];

		registerEvaluatorDependencyCollector('resource', customCollector);

		try {
			const dependencies = collectEvaluatorDependencies({
				type: 'resource',
				params: { resourceId: Resource.growth },
			});

			expect(dependencies).toEqual([
				{ type: 'resource', id: Resource.armyStrength },
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
