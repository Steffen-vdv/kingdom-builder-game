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
import { getStatBreakdownSummary } from '../src/utils/stats';
import type { TranslationContext, TranslationAssets } from '../src/translation/context';
import {
        createTranslationContextStub,
        toTranslationPlayer,
        wrapTranslationRegistry,
} from './helpers/translationContextStub';

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

function buildTranslationAssets(): TranslationAssets {
        const stats = Object.fromEntries(
                Object.entries(STATS).map(([key, info]) => [
                        key,
                        {
                                icon: info.icon,
                                label: info.label ?? info.name ?? key,
                                description: info.description,
                        },
                ]),
        );
        const populations = Object.fromEntries(
                POPULATIONS.entries().map(([id, definition]) => {
                        const record = definition as { icon?: string; label?: string; name?: string };
                        return [
                                id,
                                {
                                        icon: record.icon,
                                        label: record.label ?? record.name ?? id,
                                },
                        ];
                }),
        );
        return {
                resources: {},
                stats,
                populations: populations as TranslationAssets['populations'],
                population: { icon: '👥', label: 'Population' },
                land: {},
                slot: {},
                passive: { icon: '♾️', label: 'Passive' },
                triggers: {},
                modifiers: {},
                formatPassiveRemoval: (description) => `Active as long as ${description}`,
        } satisfies TranslationAssets;
}

function createTranslationContextFromEngine(
        engineContext: ReturnType<typeof createEngine>,
): TranslationContext {
        const assets = buildTranslationAssets();
        const wrap = <T>(registry: { get(id: string): T; has(id: string): boolean }) =>
                wrapTranslationRegistry({
                        get(id: string) {
                                return registry.get(id);
                        },
                        has(id: string) {
                                return registry.has(id);
                        },
                });
        const mapPhases = engineContext.phases.map((phase) => ({
                id: phase.id,
                icon: phase.icon,
                label: phase.label,
                steps: phase.steps?.map((step) => ({
                        id: step.id,
                        triggers: step.triggers ? [...step.triggers] : undefined,
                })),
        }));
        const buildPlayer = (player: typeof engineContext.activePlayer) =>
                toTranslationPlayer({
                        id: player.id,
                        name: player.name,
                        resources: player.resources,
                        population: player.population,
                        stats: player.stats,
                });
        return createTranslationContextStub({
                phases: mapPhases,
                actionCostResource: engineContext.actionCostResource ?? '',
                actions: wrap(engineContext.actions),
                buildings: wrap(engineContext.buildings),
                developments: wrap(engineContext.developments),
                populations: wrap(engineContext.populations),
                activePlayer: buildPlayer(engineContext.activePlayer),
                opponent: buildPlayer(engineContext.opponent),
                rules: engineContext.rules,
                assets,
        });
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

                const translationContext = createTranslationContextFromEngine(engineContext);
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
				item.includes('Ongoing as long as 🎖️ Legion is in play'),
			),
		).toBe(true);
		const permanent = objectEntries.find((entry) =>
			entry.title.includes('Raise Strength'),
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

                const translationContext = createTranslationContextFromEngine(engineContext);
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
});
