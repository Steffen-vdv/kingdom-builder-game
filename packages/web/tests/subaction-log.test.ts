import { describe, it, expect, vi } from 'vitest';
import {
  createEngine,
  performAction,
  getActionCosts,
  Resource,
  type ActionTrace,
} from '@kingdom-builder/engine';
import {
  ACTIONS,
  BUILDINGS,
  DEVELOPMENTS,
  POPULATIONS,
  PHASES,
  GAME_START,
  ACTION_INFO as actionInfo,
  RESOURCES,
} from '@kingdom-builder/contents';
import { snapshotPlayer, diffSnapshots, logContent } from '../src/translation';

vi.mock('@kingdom-builder/engine', async () => {
  return await import('../../engine/src');
});

describe('sub-action logging', () => {
  it('nests sub-action effects under the triggering action', () => {
    const ctx = createEngine({
      actions: ACTIONS,
      buildings: BUILDINGS,
      developments: DEVELOPMENTS,
      populations: POPULATIONS,
      phases: PHASES,
      start: GAME_START,
    });
    ctx.activePlayer.actions.add('plow');
    ctx.activePlayer.resources[Resource.gold] = 10;
    ctx.activePlayer.resources[Resource.ap] = 1;
    const before = snapshotPlayer(ctx.activePlayer, ctx);
    const costs = getActionCosts('plow', ctx);
    const traces = performAction('plow', ctx);
    const after = snapshotPlayer(ctx.activePlayer, ctx);
    const changes = diffSnapshots(before, after, ctx);
    const messages = logContent('action', 'plow', ctx);
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
      const subChanges = diffSnapshots(trace.before, trace.after, ctx);
      if (!subChanges.length) continue;
      subLines.push(...subChanges);
      const icon = actionInfo[trace.id]?.icon || '';
      const name = ctx.actions.get(trace.id).name;
      const line = `  ${icon} ${name}`;
      const idx = messages.indexOf(line);
      if (idx !== -1)
        messages.splice(idx + 1, 0, ...subChanges.map((c) => `    ${c}`));
    }

    const costLabels = new Set(
      Object.keys(costs) as (keyof typeof RESOURCES)[],
    );
    const filtered = changes.filter((line) => {
      if (subLines.includes(line)) return false;
      for (const key of costLabels) {
        const info = RESOURCES[key];
        const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
        if (line.startsWith(prefix)) return false;
      }
      return true;
    });
    const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];

    const expandTrace = traces.find((t) => t.id === 'expand') as ActionTrace;
    const expandDiff = diffSnapshots(
      expandTrace.before,
      expandTrace.after,
      ctx,
    );
    expandDiff.forEach((line) => {
      expect(logLines).toContain(`    ${line}`);
      expect(logLines).not.toContain(`  ${line}`);
    });
    const tillTrace = traces.find((t) => t.id === 'till') as ActionTrace;
    const tillDiff = diffSnapshots(tillTrace.before, tillTrace.after, ctx);
    tillDiff.forEach((line) => {
      expect(logLines).toContain(`    ${line}`);
      expect(logLines).not.toContain(`  ${line}`);
    });
  });
});
