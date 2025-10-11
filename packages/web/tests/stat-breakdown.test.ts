import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	runEffects,
	advance,
	performAction,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	PhaseStepId,
	GAME_START,
	RULES,
	PopulationRole,
	Stat,
	type StatKey,
	STATS,
	Resource,
	ActionId,
} from '@kingdom-builder/contents';
import type { TranslationContext } from '../src/translation/context';
import { getStatBreakdownSummary } from '../src/utils/stats';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

const isSummaryObject = (
	entry: unknown,
): entry is { title: string; items: unknown[] } =>
	typeof entry === 'object' &&
	entry !== null &&
	'title' in entry &&
	'items' in entry &&
	Array.isArray((entry as { items?: unknown }).items);

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

type EffectLike = {
	type?: string;
	method?: string;
	params?: Record<string, unknown>;
	effects?: EffectLike[];
};

function isStatKey(value: unknown): value is StatKey {
	return typeof value === 'string' && value in STATS;
}

function extractStatKey(effects?: EffectLike[]): StatKey | undefined {
	if (!effects) {
		return undefined;
	}
	for (const effect of effects) {
		if (!effect) {
			continue;
		}
		const keyParam = effect.params?.['key'];
		if (
			effect.type === 'stat' &&
			effect.method === 'add' &&
			isStatKey(keyParam)
		) {
			return keyParam;
		}
		const nested = extractStatKey(effect.effects);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function findBuildingStatSource(): { id: string; stat: StatKey } {
	for (const [id, building] of BUILDINGS.entries()) {
		const stat = extractStatKey(building.onBuild);
		if (stat) {
			return { id, stat };
		}
	}
	throw new Error('No stat-granting building found');
}

describe('stat breakdown summary', () => {
	it('includes ongoing and permanent army strength sources', () => {
		const engineContext = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		runEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: PopulationRole.Legion },
				},
			],
			engineContext,
		);

		const raiseStrengthPhase = engineContext.phases.find((phase) =>
			phase.steps.some((step) => step.id === PhaseStepId.RaiseStrength),
		);
		expect(raiseStrengthPhase).toBeDefined();
		let result;
		do {
			result = advance(engineContext);
		} while (
			result.phase !== raiseStrengthPhase!.id ||
			result.step !== PhaseStepId.RaiseStrength
		);

		const translationContext = createTranslationContextForEngine(engineContext);
		const breakdown = getStatBreakdownSummary(
			Stat.armyStrength,
			engineContext.activePlayer,
			translationContext,
		);
		expect(breakdown.length).toBeGreaterThanOrEqual(2);
		const objectEntries = breakdown.filter(isSummaryObject);
		const ongoing = objectEntries.find((entry) =>
			entry.title.includes('Legion'),
		);
		expect(ongoing).toBeTruthy();
		expect(ongoing?.title).toMatch(/^Source: /);
		expect(ongoing?.items).toEqual(
			expect.arrayContaining([expect.stringContaining('⚔️ +1')]),
		);
		const ongoingTexts = ongoing?.items.filter(
			(item): item is string => typeof item === 'string',
		);
		expect(
			ongoingTexts?.some((item) =>
				item.includes('♾️ Ongoing as long as 🎖️ Legion is in play'),
			),
		).toBe(true);
		const permanent = objectEntries.find((entry) =>
			entry.title.toLowerCase().includes('raise strength'),
		);
		expect(permanent).toBeTruthy();
		expect(permanent?.title).toMatch(/^Source: /);
		expect(permanent?.items).toEqual(
			expect.arrayContaining([
				expect.stringContaining('⚔️ +1'),
				expect.stringContaining('🗿 Permanent'),
			]),
		);
		expect(
			permanent?.items?.some(
				(item) => typeof item === 'string' && item.includes('Triggered by'),
			),
		).toBe(false);
		expect(
			permanent?.items.some(
				(item) =>
					typeof item === 'string' && item.includes('Applies immediately'),
			),
		).toBe(false);
	});

	it('omits removal suffix from build sources', () => {
		const { id: buildingId, stat } = findBuildingStatSource();
		const engineContext = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		runEffects(
			[
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.gold, amount: 50 },
				},
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.ap, amount: 5 },
				},
			],
			engineContext,
		);

		performAction(ActionId.build, engineContext, { id: buildingId });

		const translationContext = createTranslationContextForEngine(engineContext);
		const breakdown = getStatBreakdownSummary(
			stat,
			engineContext.activePlayer,
			translationContext,
		);
		const objectEntries = breakdown.filter(isSummaryObject);
		const buildSource = objectEntries.find((entry) =>
			entry.title.includes('Build'),
		);
		expect(buildSource).toBeTruthy();
		expect(buildSource?.title).toMatch(/^Source: /);
		expect(buildSource?.title).not.toContain('Removed');
	});

	it('falls back gracefully when stat metadata is missing', () => {
		const engineContext = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const statKey = Object.keys(STATS)[0]! as StatKey;
		engineContext.activePlayer.statSources[statKey] = {
			descriptor: {
				amount: 2,
				meta: {
					key: statKey,
					longevity: 'ongoing',
					kind: 'action',
					id: ACTIONS.keys()[0]!,
				},
			},
		};
		const translationContext = createTranslationContextForEngine(engineContext);
		const mutatedContext: TranslationContext = {
			...translationContext,
			assets: {
				...translationContext.assets,
				stats: {},
			},
		};

		const summary = getStatBreakdownSummary(
			statKey,
			engineContext.activePlayer,
			mutatedContext,
		);
		expect(summary).not.toHaveLength(0);
		const amountLine = summary
			.flatMap((entry) =>
				typeof entry === 'string' ? [entry] : (entry.items ?? []),
			)
			.find((line) => typeof line === 'string' && line.includes('+2'));
		expect(amountLine).toBeDefined();
	});
});
