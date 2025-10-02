import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	getActionCosts,
	type ActionTrace,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	RULES,
	RESOURCES,
	SLOT_INFO,
	PopulationRole,
	Resource,
	Stat,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
} from '../src/translation';
import { cloneStart, SYNTHETIC_IDS } from './syntheticContent';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
vi.mock(
	'@kingdom-builder/contents',
	async () => (await import('./syntheticContent')).syntheticModule,
);

describe('sub-action logging', () => {
	it('nests sub-action effects under the triggering action', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: cloneStart(),
			rules: RULES,
		});
		ctx.activePlayer.actions.add(SYNTHETIC_IDS.actions.harvest);
		ctx.activePlayer.stats[Stat.warWeariness] = 0;
		ctx.activePlayer.population[PopulationRole.Legion] = 1;
		ctx.activePlayer.resources[Resource.coin] = 10;
		ctx.activePlayer.resources[Resource.ap] = 1;
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const costs = getActionCosts(SYNTHETIC_IDS.actions.harvest, ctx);
		const traces = performAction(SYNTHETIC_IDS.actions.harvest, ctx);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const changes = diffStepSnapshots(
			before,
			after,
			ctx.actions.get(SYNTHETIC_IDS.actions.harvest),
			ctx,
			RESOURCE_KEYS,
		);
		const messages = logContent('action', SYNTHETIC_IDS.actions.harvest, ctx);
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
			const subChanges = diffStepSnapshots(
				trace.before,
				trace.after,
				ctx.actions.get(trace.id),
				ctx,
				RESOURCE_KEYS,
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

		const expandTrace = traces.find(
			(t) => t.id === SYNTHETIC_IDS.actions.expand,
		) as ActionTrace;
		const expandDiff = diffStepSnapshots(
			expandTrace.before,
			expandTrace.after,
			ctx.actions.get(SYNTHETIC_IDS.actions.expand),
			ctx,
			RESOURCE_KEYS,
		);
		expandDiff.forEach((line) => {
			expect(logLines).toContain(`    ${line}`);
			expect(logLines).not.toContain(`  ${line}`);
		});
		const cultivateTrace = traces.find(
			(t) => t.id === SYNTHETIC_IDS.actions.cultivate,
		) as ActionTrace;
		const cultivateDiff = diffStepSnapshots(
			cultivateTrace.before,
			cultivateTrace.after,
			ctx.actions.get(SYNTHETIC_IDS.actions.cultivate),
			ctx,
			RESOURCE_KEYS,
		);
		expect(cultivateDiff.length).toBeGreaterThan(0);
		expect(
			cultivateDiff.some((line) =>
				line.startsWith(`${SLOT_INFO.icon} Development Slot`),
			),
		).toBe(true);
		cultivateDiff.forEach((line) => {
			expect(logLines).toContain(`    ${line}`);
			expect(logLines).not.toContain(`  ${line}`);
		});
	});
});
