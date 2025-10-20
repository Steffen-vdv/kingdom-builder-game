import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	getActionCosts,
	type ActionTrace,
} from '@kingdom-builder/engine';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
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
	logContent,
	createTranslationDiffContext,
} from '../src/translation';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import {
	appendSubActionChanges,
	buildActionResolution,
	filterActionDiffChanges,
} from '../src/state/useActionPerformer.helpers';
import {
	buildActionLogTimeline,
	buildDevelopActionLogTimeline,
	formatActionLogLines,
} from '../src/state/actionLogFormat';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import { createDefaultTranslationAssets } from './helpers/translationAssets';

function asTimelineLines(
	entries: readonly (string | ActionLogLineDescriptor)[],
): ActionLogLineDescriptor[] {
	const lines: ActionLogLineDescriptor[] = [];
	for (const [index, entry] of entries.entries()) {
		if (typeof entry === 'string') {
			const text = entry.trim();
			if (!text) {
				continue;
			}
			lines.push({
				text,
				depth: index === 0 ? 0 : 1,
				kind: index === 0 ? 'headline' : 'effect',
			});
			continue;
		}
		lines.push(entry);
	}
	return lines;
}

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
		const changes = diffStepSnapshots(
			before,
			after,
			engineContext.actions.get(synthetic.plow.id),
			diffContext,
			RESOURCE_KEYS,
		);
		const messages = asTimelineLines(
			logContent('action', synthetic.plow.id, engineContext),
		);
		const costLines: ActionLogLineDescriptor[] = [];
		for (const key of Object.keys(
			costs,
		) as (keyof typeof SYNTHETIC_RESOURCES)[]) {
			const amount = costs[key] ?? 0;
			if (!amount) {
				continue;
			}
			const info = SYNTHETIC_RESOURCES[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const beforeResource = before.resources[key] ?? 0;
			const afterResource = beforeResource - amount;
			costLines.push({
				text: `${icon}${label} -${amount} (${beforeResource}→${afterResource})`,
				depth: 2,
				kind: 'cost-detail',
			});
		}
		if (costLines.length) {
			messages.splice(
				1,
				0,
				{ text: '💲 Action cost', depth: 1, kind: 'cost' },
				...costLines,
			);
		}
		const subLines = appendSubActionChanges({
			traces,
			context: engineContext,
			diffContext,
			resourceKeys: RESOURCE_KEYS,
			messages,
		});
		const filtered = filterActionDiffChanges({
			changes,
			messages,
			subLines,
		});
		const logLines = formatActionLogLines(messages, filtered);
		const useDevelopTimeline = filtered.some((line) =>
			line.startsWith(LOG_KEYWORDS.developed),
		);
		const manualTimeline = useDevelopTimeline
			? buildDevelopActionLogTimeline(messages, filtered)
			: buildActionLogTimeline(messages, filtered);
		const actionDefinition = engineContext.actions.get(synthetic.plow.id);
		expect(actionDefinition).toBeDefined();
		if (!actionDefinition) {
			return;
		}
		const resourceDefinitions = Object.fromEntries(
			Object.entries(SYNTHETIC_RESOURCES).map(([key, info]) => [
				key,
				{
					key,
					icon: info.icon,
					label: info.label,
				} satisfies SessionResourceDefinition,
			]),
		) as Record<string, SessionResourceDefinition>;
		const resolution = buildActionResolution({
			actionId: synthetic.plow.id,
			actionDefinition,
			traces,
			costs,
			before,
			after,
			translationContext: engineContext,
			diffContext,
			resourceKeys: RESOURCE_KEYS,
			resources: resourceDefinitions,
		});
		expect(resolution.messages).toEqual(messages);
		expect(resolution.summaries).toEqual(filtered);
		expect(resolution.logLines).toEqual(logLines);
		expect(resolution.timeline).toEqual(manualTimeline);
		expect(resolution.headline).toBe(messages[0]?.text);

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
