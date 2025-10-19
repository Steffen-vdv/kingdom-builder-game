import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	getActionCosts,
	type ActionTrace,
} from '@kingdom-builder/engine';
import {
	createSyntheticPlowContent,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_SLOT_INFO,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_PASSIVE_INFO,
} from './fixtures/syntheticPlow';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import { createDefaultTranslationAssets } from './helpers/translationAssets';
import { buildActionResolution } from '../src/state/buildActionResolution';
import type { TranslationContext } from '../src/translation/context';
import type { SessionRegistries } from '../src/state/sessionRegistries';
import type { ActionConfig } from '@kingdom-builder/protocol';

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as (keyof typeof SYNTHETIC_RESOURCES)[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function captureActivePlayer(engineContext: ReturnType<typeof createEngine>) {
	return snapshotPlayer(
		snapshotEnginePlayer(engineContext, engineContext.activePlayer),
	);
}

describe('sub-action logging', () => {
	it('nests sub-action effects under the triggering action', () => {
		const synthetic = createSyntheticPlowContent();
		const engineContext = createEngine({
			actions: synthetic.factory.actions,
			buildings: synthetic.factory.buildings,
			developments: synthetic.factory.developments,
			populations: synthetic.factory.populations,
			phases: synthetic.phases,
			start: synthetic.start,
			rules: synthetic.rules,
		});
		const baseAssets = createDefaultTranslationAssets();
		engineContext.assets = {
			...baseAssets,
			resources: {
				...baseAssets.resources,
				...SYNTHETIC_RESOURCES,
			},
			land: SYNTHETIC_LAND_INFO,
			slot: SYNTHETIC_SLOT_INFO,
			passive: SYNTHETIC_PASSIVE_INFO,
		};
		engineContext.activePlayer.actions.add(synthetic.plow.id);
		engineContext.activePlayer.resources.gold = 10;
		engineContext.activePlayer.resources.ap = 1;
		const before = captureActivePlayer(engineContext);
		const costs = getActionCosts(synthetic.plow.id, engineContext);
		const traces = performAction(synthetic.plow.id, engineContext);
		const after = captureActivePlayer(engineContext);
		const diffContext = createTranslationDiffContext(engineContext);
		const actionDefinition = engineContext.actions.get(synthetic.plow.id);
		if (!actionDefinition) {
			throw new Error('Missing plow action definition');
		}
		const resourceDefinitions: SessionRegistries['resources'] =
			Object.fromEntries(
				Object.entries(SYNTHETIC_RESOURCES).map(([resourceKey, info]) => [
					resourceKey,
					{
						key: resourceKey,
						icon: info.icon,
						label: info.label,
					},
				]),
			);
		const { logLines } = buildActionResolution({
			actionId: synthetic.plow.id,
			actionDefinition: actionDefinition as unknown as ActionConfig,
			before,
			after,
			traces,
			costs,
			context: engineContext as unknown as TranslationContext,
			diffContext,
			resourceKeys: RESOURCE_KEYS as string[],
			resources: resourceDefinitions,
		});

		const expandTrace = traces.find(
			(traceEntry) => traceEntry.id === synthetic.expand.id,
		) as ActionTrace;
		const expandDiff = diffStepSnapshots(
			expandTrace.before,
			expandTrace.after,
			engineContext.actions.get(synthetic.expand.id),
			diffContext,
			RESOURCE_KEYS,
		);
		expandDiff.forEach((line) => {
			expect(logLines).toContain(`  ↳ ${line}`);
			expect(logLines).not.toContain(`• ${line}`);
		});
		const tillTrace = traces.find(
			(traceEntry) => traceEntry.id === synthetic.till.id,
		) as ActionTrace;
		const tillDiff = diffStepSnapshots(
			tillTrace.before,
			tillTrace.after,
			engineContext.actions.get(synthetic.till.id),
			diffContext,
			RESOURCE_KEYS,
		);
		expect(tillDiff.length).toBeGreaterThan(0);
		expect(
			tillDiff.some((line) =>
				line.startsWith(
					`${SYNTHETIC_SLOT_INFO.icon} ${SYNTHETIC_SLOT_INFO.label}`,
				),
			),
		).toBe(true);
		tillDiff.forEach((line) => {
			expect(logLines).toContain(`  ↳ ${line}`);
			expect(logLines).not.toContain(`• ${line}`);
		});
	});
});
