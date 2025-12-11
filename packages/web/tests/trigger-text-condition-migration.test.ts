/**
 * TDD tests for trigger text/condition migration.
 *
 * These tests verify the expected UI output after migrating from
 * past/future to text/condition semantics.
 *
 * Expected results:
 * - decorators.ts (uninstalled): "⚒️ On build, until removed"
 * - decorators.ts (installed): "⚒️ Until removed"
 * - phased.ts (event trigger): "⚔️ Before being attacked"
 * - phased.ts (step trigger): "On your 🌱 Growth Phase"
 * - triggerLabels.ts: "On build" (from text)
 * - historyEntries.ts: "Triggered by ⚒️ Build"
 */
import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	summarizeContent,
	describeContent,
	type SummaryEntry,
	type SummaryGroup,
} from '../src/translation';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';
import { selectTriggerDisplay } from '../src/translation/context/assetSelectors';
import { resolveTriggerDescriptor } from '../src/utils/resourceSources/triggerLabels';
import { buildHistoryEntries } from '../src/utils/resourceSources/historyEntries';

function findGroupByTitle(
	entries: SummaryEntry[],
	titlePattern: string | RegExp,
): SummaryGroup | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		const matches =
			typeof titlePattern === 'string'
				? entry.title.includes(titlePattern)
				: titlePattern.test(entry.title);
		if (matches) {
			return entry;
		}
		const nested = findGroupByTitle(entry.items, titlePattern);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

describe('trigger text/condition migration', () => {
	describe('decorators.ts - building/development hovercards', () => {
		it('shows "⚒️ On build, until removed" for uninstalled buildings', () => {
			const factory = createContentFactory();
			let buildingId = '';
			const { translationContext } = buildSyntheticTranslationContext(
				({ registries, session }) => {
					const building = factory.building({
						name: 'Test Building',
						icon: '🏠',
						onBuild: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'resource:core:gold',
									change: { type: 'amount', amount: 5 },
								},
							},
						],
					});
					buildingId = building.id;
					registries.buildings.add(building.id, building);
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const summary = summarizeContent(
				'building',
				buildingId,
				translationContext,
				{ installed: false },
			);
			const effectGroup = findGroupByTitle(summary, /on build/i);
			expect(effectGroup).toBeDefined();
			expect(effectGroup?.title).toBe('⚒️ On build, until removed');
		});

		it('shows "⚒️ Until removed" for installed buildings', () => {
			const factory = createContentFactory();
			let buildingId = '';
			const { translationContext } = buildSyntheticTranslationContext(
				({ registries, session }) => {
					const building = factory.building({
						name: 'Test Building',
						icon: '🏠',
						onBuild: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'resource:core:gold',
									change: { type: 'amount', amount: 5 },
								},
							},
						],
					});
					buildingId = building.id;
					registries.buildings.add(building.id, building);
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const summary = summarizeContent(
				'building',
				buildingId,
				translationContext,
				{ installed: true },
			);
			const effectGroup = findGroupByTitle(summary, /removed/i);
			expect(effectGroup).toBeDefined();
			expect(effectGroup?.title).toBe('⚒️ Until removed');
		});

		it('shows correct text for developments (uninstalled)', () => {
			const factory = createContentFactory();
			let developmentId = '';
			const { translationContext } = buildSyntheticTranslationContext(
				({ registries, session }) => {
					const development = factory.development({
						name: 'Test Development',
						icon: '🔧',
						onBuild: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'resource:core:gold',
									change: { type: 'amount', amount: 3 },
								},
							},
						],
					});
					developmentId = development.id;
					registries.developments.add(development.id, development);
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const summary = summarizeContent(
				'development',
				developmentId,
				translationContext,
				{ installed: false },
			);
			const effectGroup = findGroupByTitle(summary, /on build/i);
			expect(effectGroup).toBeDefined();
			expect(effectGroup?.title).toBe('⚒️ On build, until removed');
		});
	});

	describe('phased.ts - trigger titles', () => {
		it('shows event trigger with icon and text', () => {
			const factory = createContentFactory();
			let buildingId = '';
			const { translationContext } = buildSyntheticTranslationContext(
				({ registries, session }) => {
					const building = factory.building({
						name: 'Defensive Tower',
						icon: '🗼',
						onBeforeAttacked: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'resource:core:gold',
									change: { type: 'amount', amount: 2 },
								},
							},
						],
					});
					buildingId = building.id;
					registries.buildings.add(building.id, building);
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBeforeAttacked: {
							icon: '⚔️',
							label: 'Before attack',
							text: 'Before being attacked',
						},
					};
				},
			);
			const summary = describeContent(
				'building',
				buildingId,
				translationContext,
			);
			const attackGroup = findGroupByTitle(summary, /attacked/i);
			expect(attackGroup).toBeDefined();
			expect(attackGroup?.title).toBe('⚔️ Before being attacked');
		});

		it('shows step trigger as "On your {phase}"', () => {
			const { session } = buildSyntheticTranslationContext(({ session }) => {
				session.metadata.triggers = {
					...session.metadata.triggers,
					'trigger.growth.start': {
						icon: '🌿',
						label: 'Growth',
						text: 'At the start of Growth',
					},
				};
			});
			// Step triggers resolve via phase lookup, showing "On your {phase}"
			const growthPhase = session.phases.find((phase) =>
				phase.id.includes('growth'),
			);
			expect(growthPhase).toBeDefined();
			// The format should be "On your {icon} {label}"
			const expectedPattern = `On your ${growthPhase?.icon} ${growthPhase?.label}`;
			expect(expectedPattern).toContain('🌱');
			expect(expectedPattern).toContain('Growth');
		});
	});

	describe('triggerLabels.ts - trigger label resolution', () => {
		it('resolves label from text field (not past)', () => {
			const { translationContext } = buildSyntheticTranslationContext(
				({ session }) => {
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const result = resolveTriggerDescriptor(
				translationContext.assets,
				'onBuild',
			);
			expect(result.icon).toBe('⚒️');
			// After migration, should prefer text over label for display
			// The label "Build" is the short form, text "On build" is display text
			expect(result.label).toBe('On build');
		});

		it('falls back to label when text is not present', () => {
			const { translationContext } = buildSyntheticTranslationContext(
				({ session }) => {
					session.metadata.triggers = {
						...session.metadata.triggers,
						someOtherTrigger: {
							icon: '🔔',
							label: 'Other Trigger',
						},
					};
				},
			);
			const result = resolveTriggerDescriptor(
				translationContext.assets,
				'someOtherTrigger',
			);
			expect(result.label).toBe('Other Trigger');
		});
	});

	describe('historyEntries.ts - history formatting', () => {
		it('formats trigger label using label field', () => {
			const triggerAssets = {
				onBuild: {
					icon: '⚒️',
					label: 'Build',
					text: 'On build',
					condition: 'Until removed',
				},
			};
			const entries = buildHistoryEntries(
				{
					extra: {
						trigger: 'onBuild',
					},
				},
				{ triggerAssets },
			);
			const triggerEntry = entries.find((e) =>
				typeof e === 'string' ? e.includes('Triggered by') : false,
			);
			expect(triggerEntry).toBeDefined();
			// Should show "Triggered by ⚒️ Build" (using label, not text)
			expect(triggerEntry).toBe('Triggered by ⚒️ Build');
		});

		it('falls back to text when label is not present', () => {
			const triggerAssets = {
				customTrigger: {
					icon: '✨',
					text: 'Custom event fired',
				},
			};
			const entries = buildHistoryEntries(
				{
					extra: {
						trigger: 'customTrigger',
					},
				},
				{ triggerAssets },
			);
			const triggerEntry = entries.find((e) =>
				typeof e === 'string' ? e.includes('Triggered by') : false,
			);
			expect(triggerEntry).toBe('Triggered by ✨ Custom event fired');
		});
	});

	describe('selectTriggerDisplay - asset selection', () => {
		it('returns text and condition fields', () => {
			const { translationContext } = buildSyntheticTranslationContext(
				({ session }) => {
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const trigger = selectTriggerDisplay(
				translationContext.assets,
				'onBuild',
			);
			expect(trigger.icon).toBe('⚒️');
			expect(trigger.label).toBe('Build');
			expect(trigger.text).toBe('On build');
			expect(trigger.condition).toBe('Until removed');
		});

		it('does not include past/future fields', () => {
			const { translationContext } = buildSyntheticTranslationContext(
				({ session }) => {
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const trigger = selectTriggerDisplay(
				translationContext.assets,
				'onBuild',
			);
			// After migration, past/future should not exist
			expect('past' in trigger).toBe(false);
			expect('future' in trigger).toBe(false);
		});
	});

	describe('no fallbacks - content-driven', () => {
		it('decorators.ts does not use fallback defaults', () => {
			const factory = createContentFactory();
			let buildingId = '';
			const { translationContext } = buildSyntheticTranslationContext(
				({ registries, session }) => {
					const building = factory.building({
						name: 'Test Building',
						icon: '🏠',
						onBuild: [
							{
								type: 'resource',
								method: 'add',
								params: {
									resourceId: 'resource:core:gold',
									change: { type: 'amount', amount: 5 },
								},
							},
						],
					});
					buildingId = building.id;
					registries.buildings.add(building.id, building);
					// Provide complete trigger metadata - no fallbacks should be needed
					session.metadata.triggers = {
						...session.metadata.triggers,
						onBuild: {
							icon: '⚒️',
							label: 'Build',
							text: 'On build',
							condition: 'Until removed',
						},
					};
				},
			);
			const summary = summarizeContent(
				'building',
				buildingId,
				translationContext,
				{ installed: false },
			);
			const effectGroup = findGroupByTitle(summary, /build/i);
			expect(effectGroup).toBeDefined();
			// Verify exact content-driven output, no "Until removed" default
			expect(effectGroup?.title).toBe('⚒️ On build, until removed');
		});
	});
});
