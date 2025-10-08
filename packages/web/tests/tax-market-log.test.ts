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
	createSyntheticTaxScenario,
	SYNTHETIC_IDS,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESOURCE_KEYS,
	type SyntheticResourceKey,
	SYNTHETIC_POPULATION_INFO,
	SYNTHETIC_POPULATION_ROLES,
	SYNTHETIC_POPULATION_ROLE_ID,
	SYNTHETIC_PHASE_IDS,
} from './fixtures/syntheticTaxLog';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
	createTranslationDiffContext,
} from '../src/translation';

const RESOURCE_KEYS = Object.keys(
	SYNTHETIC_RESOURCES,
) as SyntheticResourceKey[];

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('tax action logging with market', () => {
	it('shows population and market sources in gold gain', () => {
		const scenario = createSyntheticTaxScenario();
		const ctx = createEngine({
			actions: scenario.factory.actions,
			buildings: scenario.factory.buildings,
			developments: scenario.factory.developments,
			populations: scenario.factory.populations,
			phases: scenario.phases,
			start: scenario.start,
			rules: scenario.rules,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: SYNTHETIC_IDS.marketBuilding },
				},
			],
			ctx,
		);
		ctx.activePlayer.resources[SYNTHETIC_RESOURCE_KEYS.coin] = 0;
		while (ctx.game.currentPhase !== SYNTHETIC_PHASE_IDS.main) {
			advance(ctx);
		}
		const action = ctx.actions.get(SYNTHETIC_IDS.taxAction);
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		const costs = getActionCosts(SYNTHETIC_IDS.taxAction, ctx);
		const traces: ActionTrace[] = performAction(SYNTHETIC_IDS.taxAction, ctx);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const diffContext = createTranslationDiffContext(ctx);
		const changes = diffStepSnapshots(
			before,
			after,
			action,
			diffContext,
			RESOURCE_KEYS,
		);
		const messages = logContent('action', SYNTHETIC_IDS.taxAction, ctx);
		const costLines: string[] = [];
		for (const key of Object.keys(costs) as SyntheticResourceKey[]) {
			const amt = costs[key] ?? 0;
			if (!amt) {
				continue;
			}
			const info = SYNTHETIC_RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const b = before.resources[key] ?? 0;
			const a = b - amt;
			costLines.push(`    ${icon}${label} -${amt} (${b}→${a})`);
		}
		if (costLines.length) {
			messages.splice(1, 0, '  💲 Action cost', ...costLines);
		}
		const subLines: string[] = [];
		for (const trace of traces) {
			const subStep = ctx.actions.get(trace.id);
			const subChanges = diffStepSnapshots(
				trace.before,
				trace.after,
				subStep,
				diffContext,
				RESOURCE_KEYS,
			);
			if (!subChanges.length) {
				continue;
			}
			subLines.push(...subChanges);
			const icon = ctx.actions.get(trace.id)?.icon || '';
			const name = ctx.actions.get(trace.id).name;
			const line = `  ${icon} ${name}`;
			const idx = messages.indexOf(line);
			if (idx !== -1) {
				messages.splice(idx + 1, 0, ...subChanges.map((c) => `    ${c}`));
			}
		}
		const normalize = (line: string) =>
			(line.split(' (')[0] ?? '').replace(/\s[+-]?\d+$/, '').trim();
		const subPrefixes = subLines.map(normalize);
		const costLabels = new Set(Object.keys(costs) as SyntheticResourceKey[]);
		const filtered = changes.filter((line) => {
			if (subPrefixes.includes(normalize(line))) {
				return false;
			}
			for (const key of costLabels) {
				const info = SYNTHETIC_RESOURCES[key];
				const prefix = info?.icon ? `${info.icon} ${info.label}` : info.label;
				if (line.startsWith(prefix)) {
					return false;
				}
			}
			return true;
		});
		const logLines = [...messages, ...filtered.map((c) => `  ${c}`)];
		const goldInfo = SYNTHETIC_RESOURCES[SYNTHETIC_RESOURCE_KEYS.coin];
		const populationIcon =
			SYNTHETIC_POPULATION_ROLES[SYNTHETIC_POPULATION_ROLE_ID]?.icon ||
			SYNTHETIC_POPULATION_INFO.icon;
		const marketIcon =
			ctx.buildings.get(SYNTHETIC_IDS.marketBuilding)?.icon || '';
		const b = before.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const a = after.resources[SYNTHETIC_RESOURCE_KEYS.coin] ?? 0;
		const delta = a - b;
		const goldLine = logLines.find((l) =>
			l.trimStart().startsWith(`${goldInfo.icon} ${goldInfo.label}`),
		);
		expect(goldLine).toBe(
			`  ${goldInfo.icon} ${goldInfo.label} ${
				delta >= 0 ? '+' : ''
			}${delta} (${b}→${a}) (${goldInfo.icon}${
				delta >= 0 ? '+' : ''
			}${delta} from ${populationIcon}${marketIcon})`,
		);
	});
});
