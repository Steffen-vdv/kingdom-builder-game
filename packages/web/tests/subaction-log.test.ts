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
} from './fixtures/syntheticPlow';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
} from '../src/translation';

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as (keyof typeof SYNTHETIC_RESOURCES)[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('sub-action logging', () => {
	it('nests sub-action effects under the triggering action', () => {
		const synthetic = createSyntheticPlowContent();
		const ctx = createEngine({
			actions: synthetic.factory.actions,
			buildings: synthetic.factory.buildings,
			developments: synthetic.factory.developments,
			populations: synthetic.factory.populations,
			phases: synthetic.phases,
			start: synthetic.start,
			rules: synthetic.rules,
		});
		ctx.activePlayer.actions.add(synthetic.plow.id);
		ctx.activePlayer.resources.gold = 10;
		ctx.activePlayer.resources.ap = 1;
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const costs = getActionCosts(synthetic.plow.id, ctx);
		const traces = performAction(synthetic.plow.id, ctx);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const changes = diffStepSnapshots(
			before,
			after,
			ctx.actions.get(synthetic.plow.id),
			ctx,
			RESOURCE_KEYS,
		);
		const messages = logContent('action', synthetic.plow.id, ctx);
		const costLines: string[] = [];
		for (const key of Object.keys(
			costs,
		) as (keyof typeof SYNTHETIC_RESOURCES)[]) {
			const amt = costs[key] ?? 0;
			if (!amt) continue;
			const info = SYNTHETIC_RESOURCES[key];
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
			const action = ctx.actions.get(trace.id);
			const icon = action?.icon || '';
			const name = action?.name || trace.id;
			const line = `  ${icon} ${name}`;
			const idx = messages.indexOf(line);
			if (idx !== -1)
				messages.splice(idx + 1, 0, ...subChanges.map((c) => `    ${c}`));
		}

		const costLabels = new Set(
			Object.keys(costs) as (keyof typeof SYNTHETIC_RESOURCES)[],
		);
		const filtered = changes.filter((line) => {
			if (subLines.includes(line)) return false;
			for (const key of costLabels) {
				const info = SYNTHETIC_RESOURCES[key];
				const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
				if (line.startsWith(prefix)) return false;
			}
			return true;
		});
		const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];

		const expandTrace = traces.find(
			(t) => t.id === synthetic.expand.id,
		) as ActionTrace;
		const expandDiff = diffStepSnapshots(
			expandTrace.before,
			expandTrace.after,
			ctx.actions.get(synthetic.expand.id),
			ctx,
			RESOURCE_KEYS,
		);
		expandDiff.forEach((line) => {
			expect(logLines).toContain(`    ${line}`);
			expect(logLines).not.toContain(`  ${line}`);
		});
		const tillTrace = traces.find(
			(t) => t.id === synthetic.till.id,
		) as ActionTrace;
		const tillDiff = diffStepSnapshots(
			tillTrace.before,
			tillTrace.after,
			ctx.actions.get(synthetic.till.id),
			ctx,
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
			expect(logLines).toContain(`    ${line}`);
			expect(logLines).not.toContain(`  ${line}`);
		});
	});
});
