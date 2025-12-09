/**
 * Translation Format Rules
 *
 * This file enforces the formatting conventions for effect summaries
 * and descriptions. These rules ensure consistent, concise UI text.
 *
 * ═══════════════════════════════════════════════════════════════════
 * RULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1. TRIGGER PREFIXES
 *    ─────────────────
 *    Step triggers:  "On your <icon> <Phase Label> Phase"
 *                    NO step text (e.g., no "Gain Income step")
 *    Event triggers: "<icon> <text>" (e.g., "⚔️ After attack")
 *
 * 2. DEVELOPMENT EFFECTS
 *    ───────────────────
 *    Add (summary):    "<icon> <name>"
 *    Add (describe):   "Add <icon> <name>"
 *    Remove (summary): "-<icon>"
 *    Remove (describe):"Remove <icon> <name>"
 *
 * 3. PASSIVE DURATION (split into two entries)
 *    ──────────────────────────────────────────
 *    Entry 1 - Add:
 *      Summary:  "+♾️: <icon> <name>"
 *      Describe: "Gain ♾️ Passive: <icon> <name>"
 *      Items:    [child effects]
 *
 *    Entry 2 - Remove (under trigger):
 *      Title:    "On your <icon> <Phase Label> Phase"
 *      Summary:  "-♾️: <icon> <name>"
 *      Describe: "Remove ♾️ Passive: <icon> <name>"
 *
 * 4. RESOURCE EFFECTS
 *    ─────────────────
 *    Summary:  "<icon> +/-<amount>"
 *    Describe: "<icon> +/-<amount> <label>"
 *
 * ═══════════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest';
import type { EffectDef, SessionPlayerId } from '@kingdom-builder/protocol';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createFormatterContext(config: {
	phases: Array<{
		id: string;
		label: string;
		icon: string;
		steps?: Array<{ id: string; triggers?: string[] }>;
	}>;
	triggers: Record<string, { past?: string; future?: string; icon?: string }>;
	developments?: Record<string, { icon?: string; name?: string }>;
}) {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);

	for (const phase of config.phases) {
		metadata.phases = {
			...metadata.phases,
			[phase.id]: {
				id: phase.id,
				label: phase.label,
				icon: phase.icon,
			},
		};
	}
	metadata.triggers = { ...metadata.triggers, ...config.triggers };

	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as SessionPlayerId,
	});

	const phases = config.phases.map((phase) => ({
		id: phase.id,
		label: phase.label,
		icon: phase.icon,
		action: false,
		steps: phase.steps ?? [],
	}));

	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: phases as Parameters<typeof createSessionSnapshot>[0]['phases'],
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});

	return createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
}

describe('translation format rules', () => {
	describe('Rule 1: Trigger prefix formatting', () => {
		it('step triggers use "On your <icon> <Phase> Phase" format', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:growth',
						label: 'Growth',
						icon: '🌲',
						steps: [{ id: 'step:income', triggers: ['onGainIncomeStep'] }],
					},
				],
				triggers: {
					onGainIncomeStep: { past: 'Income', icon: '💰' },
				},
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:passive',
					name: 'Test Passive',
					icon: '🎯',
					onGainIncomeStep: [],
				},
				effects: [],
			};

			const summary = summarizeEffects([passive], context);
			// Second entry should be the trigger with phase format
			const triggerEntry = summary[1];
			expect(triggerEntry).toEqual(
				expect.objectContaining({
					title: 'On your 🌲 Growth Phase',
				}),
			);
			// Must NOT contain step text like "Gain Income step"
			expect(JSON.stringify(summary)).not.toMatch(/step/i);
		});

		it('step triggers must not include step label text', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:upkeep',
						label: 'Upkeep',
						icon: '🧹',
						steps: [
							{
								id: 'step:pay-upkeep',
								triggers: ['onPayUpkeepStep'],
							},
						],
					},
				],
				triggers: {
					onPayUpkeepStep: { past: 'Pay Upkeep', icon: '💸' },
				},
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:passive',
					name: 'Test',
					icon: '📝',
					onPayUpkeepStep: [],
				},
				effects: [],
			};

			const summary = summarizeEffects([passive], context);
			const summaryText = JSON.stringify(summary);

			// Forbidden patterns - step text should never appear
			expect(summaryText).not.toMatch(/Pay Upkeep step/i);
			expect(summaryText).not.toMatch(/— .* step/i);
		});
	});

	describe('Rule 2: Development effect formatting', () => {
		it('development remove summary shows just "-<icon>"', () => {
			const scaffold = createTestSessionScaffold();
			// Find a development with an icon from the scaffold
			const devEntries = [...scaffold.registries.developments.entries()];
			const devWithIcon = devEntries.find(
				([, def]) => def.icon && def.icon.length > 0,
			);
			if (!devWithIcon) {
				throw new Error('Test requires a development with an icon');
			}
			const [devId, devDef] = devWithIcon;

			const context = createFormatterContext({
				phases: [],
				triggers: {},
			});

			const removeEffect: EffectDef = {
				type: 'development',
				method: 'remove',
				params: { id: devId },
			};

			const summary = summarizeEffects([removeEffect], context);
			// Summary should be concise: just -<icon>
			expect(summary[0]).toMatch(/^-./u);
			// Should only be the icon, not the full name
			expect(summary[0]).toBe(`-${devDef.icon}`);
		});
	});

	describe('Rule 3: Passive duration split format', () => {
		it('duration passives split into add entry + remove entry', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:upkeep',
						label: 'Rest',
						icon: '🛌',
						steps: [{ id: 'step:upkeep', triggers: ['onPayUpkeepStep'] }],
					},
				],
				triggers: {
					onPayUpkeepStep: { past: 'Upkeep', icon: '🧹' },
				},
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:hangover',
					name: 'Festival Hangover',
					icon: '🤮',
					onPayUpkeepStep: [],
				},
				effects: [],
			};

			const summary = summarizeEffects([passive], context);
			expect(summary).toHaveLength(2);

			// Entry 1: Add passive - "+♾️: <icon> <name>"
			const addEntry = summary[0];
			expect(addEntry).toEqual(
				expect.objectContaining({
					title: '+♾️: 🤮 Festival Hangover',
				}),
			);

			// Entry 2: Remove under trigger - "-♾️: <icon> <name>"
			const removeEntry = summary[1];
			expect(removeEntry).toEqual(
				expect.objectContaining({
					title: 'On your 🛌 Rest Phase',
					items: ['-♾️: 🤮 Festival Hangover'],
				}),
			);
		});

		it('describe mode uses "Gain/Remove ♾️ Passive" format', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:upkeep',
						label: 'Upkeep',
						icon: '🧹',
						steps: [{ id: 'step:upkeep', triggers: ['onPayUpkeepStep'] }],
					},
				],
				triggers: {
					onPayUpkeepStep: { past: 'Upkeep', icon: '💸' },
				},
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:buff',
					name: 'Power Buff',
					icon: '💪',
					onPayUpkeepStep: [],
				},
				effects: [],
			};

			const description = describeEffects([passive], context);
			expect(description).toHaveLength(2);

			// Entry 1: "Gain ♾️ Passive: <icon> <name>"
			const addEntry = description[0];
			expect(addEntry).toEqual(
				expect.objectContaining({
					title: 'Gain ♾️ Passive: 💪 Power Buff',
				}),
			);

			// Entry 2: "Remove ♾️ Passive: <icon> <name>"
			const removeEntry = description[1];
			expect(removeEntry).toEqual(
				expect.objectContaining({
					title: 'On your 🧹 Upkeep Phase',
					items: ['Remove ♾️ Passive: 💪 Power Buff'],
				}),
			);
		});

		it('passive without duration returns flat effects (no split)', () => {
			const context = createFormatterContext({
				phases: [],
				triggers: {},
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:permanent',
					name: 'Permanent Buff',
				},
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: { resourceId: 'resource:core:gold', change: { amount: 5 } },
					},
				],
			};

			const summary = summarizeEffects([passive], context);
			// No duration = no split, just the inner effects
			expect(summary.every((e) => typeof e === 'string')).toBe(true);
		});
	});

	describe('format consistency checks', () => {
		it('passive add labels match expected pattern', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:test',
						label: 'Test',
						icon: '🧪',
						steps: [{ id: 'step:test', triggers: ['onTestStep'] }],
					},
				],
				triggers: { onTestStep: { past: 'Test' } },
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:passive',
					name: 'Test Effect',
					icon: '✨',
					onTestStep: [],
				},
				effects: [],
			};

			const summary = summarizeEffects([passive], context);
			const description = describeEffects([passive], context);

			// Summary add: "+♾️: <icon> <name>"
			expect((summary[0] as { title: string }).title).toBe(
				'+♾️: ✨ Test Effect',
			);

			// Describe add: "Gain ♾️ Passive: <icon> <name>"
			expect((description[0] as { title: string }).title).toBe(
				'Gain ♾️ Passive: ✨ Test Effect',
			);
		});

		it('passive remove labels include full name in both modes', () => {
			const context = createFormatterContext({
				phases: [
					{
						id: 'phase:test',
						label: 'Test Phase',
						icon: '🧪',
						steps: [{ id: 'step:test', triggers: ['onTestStep'] }],
					},
				],
				triggers: { onTestStep: { past: 'Test' } },
			});

			const passive: EffectDef = {
				type: 'passive',
				method: 'add',
				params: {
					id: 'test:passive',
					name: 'My Effect',
					icon: '🎭',
					onTestStep: [],
				},
				effects: [],
			};

			const summary = summarizeEffects([passive], context);
			const description = describeEffects([passive], context);

			// Summary remove: "-♾️: <icon> <name>"
			const summaryRemove = (summary[1] as { items: string[] }).items[0];
			expect(summaryRemove).toBe('-♾️: 🎭 My Effect');

			// Describe remove: "Remove ♾️ Passive: <icon> <name>"
			const describeRemove = (description[1] as { items: string[] }).items[0];
			expect(describeRemove).toBe('Remove ♾️ Passive: 🎭 My Effect');
		});
	});
});
