import { describe, expect, it, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import type { EffectDef, PlayerId } from '@kingdom-builder/engine';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createDefaultTranslationAssets } from './helpers/translationAssets';
import { selectStatDisplay } from '../src/translation/context/assetSelectors';
import type { TranslationAssets } from '../src/translation/context';
import { formatStatValue } from '../src/utils/stats';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createContext() {
	const scaffold = createTestSessionScaffold();
	const { registries, metadata, phases, ruleSnapshot } = scaffold;
	const [actionId] = registries.actions.keys();
	const [developmentId] = registries.developments.keys();
	const [resourceKey] = Object.keys(registries.resources);
	const players = [
		createSnapshotPlayer({
			id: 'A' as PlayerId,
			resources: resourceKey ? { [resourceKey]: 10 } : {},
			actions: actionId ? [actionId] : [],
		}),
		createSnapshotPlayer({ id: 'B' as PlayerId }),
	];
	const session = createSessionSnapshot({
		players,
		activePlayerId: players[0]?.id ?? ('A' as PlayerId),
		opponentId: players[1]?.id ?? ('B' as PlayerId),
		phases,
		actionCostResource: resourceKey,
		ruleSnapshot,
		metadata,
	});
	const context = createTranslationContext(session, registries, metadata, {
		ruleSnapshot,
		passiveRecords: session.passiveRecords,
	});
	return {
		context,
		developmentId: developmentId ?? 'development:missing',
		resourceKey: resourceKey ?? 'resource:missing',
	};
}

describe('modifier percent formatting', () => {
	it('describes rounded percent bonuses and penalties', () => {
		const { context, developmentId } = createContext();
		const bonus: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income',
				evaluation: { type: 'development', id: developmentId },
				percent: 0.2,
			},
			round: 'up',
		};
		const resultDescriptor = context.assets.modifiers.result;
		const development = context.developments.get(developmentId);
		const targetIcon = development.icon?.trim().length
			? development.icon
			: development.name;
		const bonusSummary = summarizeEffects([bonus], context);
		expect(bonusSummary).toEqual([
			expect.stringContaining(`${resultDescriptor.icon}${targetIcon}`),
		]);
		expect(bonusSummary[0]).toContain('gain 20% more');
		expect(bonusSummary[0]).toContain('rounded up');
		const bonusDescription = describeEffects([bonus], context);
		expect(bonusDescription[0]).toContain(resultDescriptor.label);
		expect(bonusDescription[0]).toContain(development.name);
		expect(bonusDescription[0]).toContain(
			'20% more of that resource (rounded up)',
		);

		const penaltyCtx = createContext();
		const penalty: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income:penalty',
				evaluation: {
					type: 'development',
					id: penaltyCtx.developmentId,
				},
				percent: -0.25,
			},
			round: 'down',
		};
		const penaltySummary = summarizeEffects([penalty], penaltyCtx.context);
		expect(penaltySummary[0]).toContain('gain 25% less');
		expect(penaltySummary[0]).toContain('rounded down');
		const penaltyDescription = describeEffects([penalty], penaltyCtx.context);
		expect(penaltyDescription[0]).toContain(
			'25% less of that resource (rounded down)',
		);
	});

	it('falls back to raw numbers when percent metadata is missing', () => {
		const assets = createDefaultTranslationAssets();
		const fallbackAssets: TranslationAssets = {
			...assets,
			stats: {},
		};
		const display = selectStatDisplay(fallbackAssets, 'unknown-stat');
		expect(display.label).toBe('unknown-stat');
		const fallbackValue = formatStatValue('unknown-stat', 0.5, fallbackAssets);
		expect(fallbackValue).toBe('0.5');
	});

	it('labels unknown development modifiers with the default income descriptor', () => {
		const { context } = createContext();
		const mysteryModifier: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'mystery:modifier',
				evaluation: { type: 'development', id: 'mystery:development' },
				percent: 0.15,
			},
			round: 'up',
		};
		const [summary] = summarizeEffects([mysteryModifier], context);
		expect(summary).toContain('Development');
	});
});
