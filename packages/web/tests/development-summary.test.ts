import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	summarizeContent,
	summarizeEffects,
	type SummaryEntry,
	type SummaryGroup,
} from '../src/translation';
import type {
	TranslationContext,
	TranslationPassives,
	TranslationAssets,
} from '../src/translation/context';
import { TRIGGER_INFO, Resource } from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	wrapTranslationRegistry,
	toTranslationPlayer,
} from './helpers/translationContextStub';

function flatten(entries: SummaryEntry[]): string[] {
	const lines: string[] = [];
	for (const entry of entries) {
		if (typeof entry === 'string') {
			lines.push(entry);
			continue;
		}
		lines.push(entry.title);
		lines.push(...flatten(entry.items));
	}
	return lines;
}

function findGroup(
	entries: SummaryEntry[],
	predicate: (entry: SummaryGroup) => boolean,
): SummaryGroup | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (predicate(entry)) {
			return entry;
		}
		const nested = findGroup(entry.items, predicate);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

describe('development summary', () => {
	it('merges phase-triggered effects referencing the development', () => {
		const factory = createContentFactory();
		const development = factory.development({
			name: 'Test Development',
			icon: '🧪',
		});
		const resourceKey = Resource.gold;
		const nestedEffect: EffectDef<Record<string, unknown>> = {
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount: 3 },
		};
		const phaseEffect: EffectDef<Record<string, unknown>> = {
			evaluator: { type: 'development', params: { id: development.id } },
			effects: [nestedEffect],
		};
		const phase = {
			id: 'growth',
			label: 'Growth',
			icon: '🏗️',
			steps: [
				{
					id: 'gain-income',
					title: 'Gain Income',
					triggers: ['onGainIncomeStep'],
					effects: [phaseEffect],
				},
			],
		};
		const passives: TranslationPassives = {
			list() {
				return [];
			},
			get() {
				return undefined;
			},
			getDefinition() {
				return undefined;
			},
			definitions() {
				return [];
			},
			get evaluationMods() {
				return new Map();
			},
		};
		const assets: TranslationAssets = {
			resources: {
				[resourceKey]: { icon: '🪙', label: 'Gold' },
			},
			stats: {},
			populations: {},
			population: {},
			land: {},
			slot: {},
			passive: {},
			upkeep: {},
			modifiers: {},
			triggers: TRIGGER_INFO,
			tierSummaries: {},
			formatPassiveRemoval(description: string) {
				return `Active as long as ${description}`;
			},
		};
		const activePlayer = toTranslationPlayer({
			id: 'A',
			name: 'Active',
			resources: { [resourceKey]: 0 },
			population: {},
		});
		const opponent = toTranslationPlayer({
			id: 'B',
			name: 'Opponent',
			resources: { [resourceKey]: 0 },
			population: {},
		});
		const translationContext: TranslationContext = {
			actions: wrapTranslationRegistry(factory.actions),
			buildings: wrapTranslationRegistry(factory.buildings),
			developments: wrapTranslationRegistry(factory.developments),
			populations: wrapTranslationRegistry(factory.populations),
			passives,
			phases: [phase],
			activePlayer,
			opponent,
			rules: {
				tieredResourceKey: resourceKey,
				tierDefinitions: [],
				winConditions: [],
			},
			pullEffectLog() {
				return undefined;
			},
			actionCostResource: undefined,
			recentResourceGains: [],
			compensations: { [activePlayer.id]: {}, [opponent.id]: {} },
			assets,
		};
		const summary = summarizeContent(
			'development',
			development.id,
			translationContext,
		);
		const expectedPhaseLabel = `On each ${phase.label} Phase`;
		const incomeGroup = findGroup(summary, (entry) => {
			return entry.title.includes(expectedPhaseLabel);
		});
		expect(incomeGroup).toBeDefined();
		if (!incomeGroup) {
			return;
		}
		const triggerIcon = TRIGGER_INFO.onGrowthPhase.icon;
		if (triggerIcon) {
			expect(incomeGroup.title).toContain(triggerIcon);
		}
		expect(incomeGroup.title).toContain(phase.label ?? '');
		expect(incomeGroup.title).toContain(phase.icon ?? '');
		const expectedLines = summarizeEffects(
			phaseEffect.effects,
			translationContext,
		);
		const flattened = flatten(incomeGroup.items);
		for (const expected of expectedLines) {
			if (typeof expected === 'string') {
				expect(flattened).toContain(expected);
			} else {
				expect(incomeGroup.items).toContainEqual(expected);
			}
		}
	});
});
