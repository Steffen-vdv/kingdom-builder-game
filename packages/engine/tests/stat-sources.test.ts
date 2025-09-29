import { describe, it, expect } from 'vitest';
import { advance, runEffects } from '../src/index.ts';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import type { EffectDef } from '../src/effects/index.ts';
import {
  resolveStatSourceMeta,
  applyStatDelta,
  withStatSourceFrames,
  collectEvaluatorDependencies,
  recordEffectStatDelta,
} from '../src/stat_sources.ts';

function findPhaseStep(
  ctx: ReturnType<typeof createTestEngine>,
  stepId: string,
) {
  return ctx.phases.find((phase) =>
    phase.steps.some((step) => step.id === stepId),
  );
}

describe('stat sources tracking', () => {
  it('captures ongoing and permanent stat sources with dependencies', () => {
    const ctx = createTestEngine();
    const player = ctx.activePlayer;

    const growthSources = Object.values(player.statSources[Stat.growth] ?? {});
    expect(growthSources.length).toBeGreaterThan(0);
    const growthTotal = growthSources.reduce(
      (sum, entry) => sum + entry.amount,
      0,
    );
    expect(growthTotal).toBeCloseTo(player.stats[Stat.growth]);
    expect(
      growthSources.some((entry) => entry.meta.longevity === 'permanent'),
    ).toBe(true);

    runEffects(
      [
        {
          type: 'population',
          method: 'add',
          params: { role: PopulationRole.Legion },
        },
      ],
      ctx,
    );

    const getPopulationEntries = () =>
      Object.values(player.statSources[Stat.armyStrength] ?? {}).filter(
        (entry) => entry.meta.kind === 'population',
      );
    const [passiveEntry] = getPopulationEntries();
    expect(passiveEntry?.amount).toBe(1);
    expect(passiveEntry?.meta.longevity).toBe('ongoing');
    expect(passiveEntry?.meta.kind).toBe('population');
    expect(passiveEntry?.meta.detail).toBe('Passive');
    expect(passiveEntry?.meta.dependsOn).toContainEqual({
      type: 'population',
      id: PopulationRole.Legion,
      detail: 'assigned',
    });
    expect(passiveEntry?.meta.removal).toMatchObject({
      type: 'population',
      id: PopulationRole.Legion,
      detail: 'unassigned',
    });

    const raiseStrengthPhase = findPhaseStep(ctx, 'raise-strength');
    expect(raiseStrengthPhase).toBeDefined();
    let result;
    do {
      result = advance(ctx);
    } while (
      result.phase !== raiseStrengthPhase!.id ||
      result.step !== 'raise-strength'
    );

    const phaseEntry = Object.values(
      player.statSources[Stat.armyStrength] ?? {},
    ).find((entry) => entry.meta.kind === 'phase');
    expect(phaseEntry?.amount).toBe(1);
    expect(phaseEntry?.meta.detail).toBe('raise-strength');
    expect(phaseEntry?.meta.longevity).toBe('permanent');
    expect(phaseEntry?.meta.dependsOn).toEqual(
      expect.arrayContaining([
        { type: 'population', id: PopulationRole.Legion },
        { type: 'stat', id: Stat.growth },
      ]),
    );

    runEffects(
      [
        {
          type: 'population',
          method: 'remove',
          params: { role: PopulationRole.Legion },
        },
      ],
      ctx,
    );

    expect(getPopulationEntries()).toHaveLength(0);
    expect(phaseEntry?.amount).toBe(1);
  });

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
});
