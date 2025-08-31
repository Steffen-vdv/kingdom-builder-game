import { describe, it, expect, vi } from 'vitest';
import {
  createEngine,
  performAction,
  advance,
  getActionCosts,
  runEffects,
  type ActionTrace,
} from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  RULES,
  RESOURCES,
  Resource,
} from '@kingdom-builder/contents';
import {
  snapshotPlayer,
  diffStepSnapshots,
  logContent,
} from '../src/translation';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

describe('tax action logging with market', () => {
  it('shows population and market sources in gold gain', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
      rules: RULES,
    });
    runEffects(
      [{ type: 'building', method: 'add', params: { id: 'market' } }],
      ctx,
    );
    ctx.activePlayer.resources[Resource.gold] = 0;
    while (ctx.game.currentPhase !== 'main') advance(ctx);
    const action = ctx.actions.get('tax');
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const costs = getActionCosts('tax', ctx);
    const traces: ActionTrace[] = performAction('tax', ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const changes = diffStepSnapshots(before, after, action, ctx);
    const messages = logContent('action', 'tax', ctx);
    const costLines: string[] = [];
    for (const key of Object.keys(costs) as (keyof typeof RESOURCES)[]) {
      const amt = costs[key] ?? 0;
      if (!amt) continue;
      const info = RESOURCES[key];
      const icon = info?.icon ? `${info.icon} ` : '';
      const label = info?.label ?? key;
      const b = before.resources[key] ?? 0;
      const a = b - amt;
      costLines.push(`    ${icon}${label} -${amt} (${b}→${a})`);
    }
    if (costLines.length)
      messages.splice(1, 0, '  💲 Action cost', ...costLines);
    const subLines: string[] = [];
    for (const trace of traces) {
      const subStep = ctx.actions.get(trace.id);
      const subChanges = diffStepSnapshots(
        trace.before,
        trace.after,
        subStep,
        ctx,
      );
      if (!subChanges.length) continue;
      subLines.push(...subChanges);
      const icon = ctx.actions.get(trace.id)?.icon || '';
      const name = ctx.actions.get(trace.id).name;
      const line = `  ${icon} ${name}`;
      const idx = messages.indexOf(line);
      if (idx !== -1)
        messages.splice(idx + 1, 0, ...subChanges.map((c) => `    ${c}`));
    }
    const normalize = (line: string) =>
      (line.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
    const subPrefixes = subLines.map(normalize);
    const costLabels = new Set(
      Object.keys(costs) as (keyof typeof RESOURCES)[],
    );
    const filtered = changes.filter((line) => {
      if (subPrefixes.includes(normalize(line))) return false;
      for (const key of costLabels) {
        const info = RESOURCES[key];
        const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
        if (line.startsWith(prefix)) return false;
      }
      return true;
    });
    const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];
    const goldInfo = RESOURCES[Resource.gold];
    const populationIcon = '👥';
    const marketIcon = BUILDINGS.get('market')?.icon || '';
    const b = before.resources[Resource.gold] ?? 0;
    const a = after.resources[Resource.gold] ?? 0;
    const delta = a - b;
    const goldLine = logLines.find((l) =>
      l.trimStart().startsWith(`${goldInfo.icon} ${goldInfo.label}`),
    );
    expect(goldLine).toBe(
      `  ${goldInfo.icon} ${goldInfo.label} ${delta >= 0 ? '+' : ''}${delta} (${b}→${a}) (${goldInfo.icon}${delta >= 0 ? '+' : ''}${delta} from ${populationIcon}+${marketIcon})`,
    );
  });
});
