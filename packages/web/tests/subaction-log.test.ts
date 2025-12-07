import { describe, it, expect, vi } from 'vitest';
import {
	createEngine,
	performAction,
	getActionCosts,
	runEffects,
	type ActionTrace,
} from '@kingdom-builder/engine';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import {
	createSyntheticPlowContent,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESOURCES_V2,
	SYNTHETIC_RESOURCE_V2_KEYS,
	SYNTHETIC_SLOT_INFO,
	SYNTHETIC_LAND_INFO,
	SYNTHETIC_PASSIVE_INFO,
	SKIP_SETUP_ACTION_IDS,
	buildStartConfigEffects,
} from './fixtures/syntheticPlow';
import {
	snapshotPlayer,
	diffStepSnapshots,
	logContent,
	createTranslationDiffContext,
} from '../src/translation';
import type {
	TranslationContext,
	TranslationActionCategoryRegistry,
} from '../src/translation/context';
import {
	cloneResourceCatalogV2,
	createResourceV2MetadataSelectors,
} from '../src/translation/context';
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
import type { ActionDiffChange } from '../src/translation/log/diff';
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

const RESOURCE_KEYS = Object.values(SYNTHETIC_RESOURCE_V2_KEYS);

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function captureActivePlayer(engineContext: ReturnType<typeof createEngine>) {
	return snapshotPlayer(
		snapshotEnginePlayer(engineContext, engineContext.activePlayer),
	);
}

function filterChangeTree(
	changes: readonly ActionDiffChange[],
	allowed: Set<string>,
): ActionDiffChange[] {
	const filtered: ActionDiffChange[] = [];
	for (const change of changes) {
		const filteredChildren = change.children
			? filterChangeTree(change.children, allowed)
			: [];
		if (allowed.has(change.summary)) {
			const clone: ActionDiffChange = {
				summary: change.summary,
				...(change.meta ? { meta: { ...change.meta } } : {}),
			};
			if (filteredChildren.length) {
				clone.children = filteredChildren;
			}
			filtered.push(clone);
			continue;
		}
		filtered.push(...filteredChildren);
	}
	return filtered;
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
			rules: synthetic.rules,
			resourceCatalogV2: synthetic.resourceCatalogV2,
			systemActionIds: SKIP_SETUP_ACTION_IDS,
		});
		runEffects(buildStartConfigEffects(synthetic.start), engineContext);
		const baseAssets = createDefaultTranslationAssets();
		engineContext.assets = {
			...baseAssets,
			resources: {
				...baseAssets.resources,
				...SYNTHETIC_RESOURCES,
				...SYNTHETIC_RESOURCES_V2,
			},
			land: SYNTHETIC_LAND_INFO,
			slot: SYNTHETIC_SLOT_INFO,
			passive: SYNTHETIC_PASSIVE_INFO,
		};
		engineContext.activePlayer.actions.add(synthetic.plow.id);
		engineContext.activePlayer.resourceValues[SYNTHETIC_RESOURCE_V2_KEYS.gold] =
			10;
		engineContext.activePlayer.resourceValues[SYNTHETIC_RESOURCE_V2_KEYS.ap] =
			1;
		const before = captureActivePlayer(engineContext);
		const costs = getActionCosts(synthetic.plow.id, engineContext);
		const traces = performAction(synthetic.plow.id, engineContext);
		const after = captureActivePlayer(engineContext);
		// Create resource metadata selectors from the catalog
		const catalogClone = cloneResourceCatalogV2(synthetic.resourceCatalogV2);
		const resourceMetadataV2 = createResourceV2MetadataSelectors(catalogClone);
		// Create stub action categories
		const actionCategories: TranslationActionCategoryRegistry = {
			categories: new Map(),
			get: () => undefined,
		};
		// Create proper activePlayer structure for diff context
		const diffActivePlayer = {
			id: engineContext.game.activePlayerId,
			population: { ...engineContext.activePlayer.population },
			lands: engineContext.activePlayer.lands.map((land) => ({
				developments: [...land.developments],
			})),
		};
		const diffContext = createTranslationDiffContext({
			...engineContext,
			activePlayer: diffActivePlayer,
			actionCategories,
			resourceMetadataV2,
		});
		const translationContext = {
			...engineContext,
			rules: synthetic.rules,
		} as unknown as TranslationContext;
		const diffResult = diffStepSnapshots(
			before,
			after,
			engineContext.actions.get(synthetic.plow.id),
			diffContext,
			RESOURCE_KEYS,
		);
		const changes = diffResult.summaries;
		const messages = asTimelineLines(
			logContent('action', synthetic.plow.id, translationContext),
		);
		const costLines: ActionLogLineDescriptor[] = [];
		for (const key of Object.keys(costs)) {
			const amount = costs[key] ?? 0;
			if (!amount) {
				continue;
			}
			const info = SYNTHETIC_RESOURCES_V2[key];
			const icon = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? key;
			const beforeResource = before.valuesV2?.[key] ?? 0;
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
			context: translationContext,
			diffContext,
			resourceKeys: RESOURCE_KEYS,
			messages,
		});
		const filtered = filterActionDiffChanges({
			changes,
			messages,
			subLines,
		});
		const filteredTree = filterChangeTree(diffResult.tree, new Set(filtered));
		const logLines = formatActionLogLines(messages, filteredTree);
		const useDevelopTimeline = filtered.some((line) =>
			line.startsWith(LOG_KEYWORDS.developed),
		);
		const manualTimeline = useDevelopTimeline
			? buildDevelopActionLogTimeline(messages, filteredTree)
			: buildActionLogTimeline(messages, filteredTree);
		const actionDefinition = engineContext.actions.get(synthetic.plow.id);
		expect(actionDefinition).toBeDefined();
		if (!actionDefinition) {
			return;
		}
		const resourceDefinitions = Object.fromEntries(
			Object.entries(SYNTHETIC_RESOURCES_V2).map(([key, info]) => [
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
			translationContext,
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
		expandDiff.summaries.forEach((line) => {
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
		expect(tillDiff.summaries.length).toBeGreaterThan(0);
		expect(
			tillDiff.summaries.some((line) =>
				line.startsWith(
					`${SYNTHETIC_SLOT_INFO.icon} ${SYNTHETIC_SLOT_INFO.label}`,
				),
			),
		).toBe(true);
		tillDiff.summaries.forEach((line) => {
			expect(logLines).toContain(`  ↳ ${line}`);
			expect(logLines).not.toContain(`• ${line}`);
		});
	});
});
