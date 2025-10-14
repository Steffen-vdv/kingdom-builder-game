import { describe, it, expect } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import type { EffectDef, PlayerId } from '@kingdom-builder/engine';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createFormatterContext({
	phases,
	configureMetadata,
}: {
	phases: ReturnType<typeof createTestSessionScaffold>['phases'];
	configureMetadata?: (
		metadata: ReturnType<typeof createTestSessionScaffold>['metadata'],
	) => void;
}) {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	configureMetadata?.(metadata);
	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as PlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as PlayerId,
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
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

const formatDurationLabel = (label?: string, icon?: string) => {
	const parts: string[] = [];
	if (icon) {
		parts.push(icon);
	}
	if (label) {
		parts.push(label);
	}
	return parts.join(' ').trim();
};

describe('passive formatter duration metadata', () => {
	it('uses custom phase metadata when provided', () => {
		const festivalPhaseId = 'phase:festival';
		const context = createFormatterContext({
			phases: [
				{
					id: festivalPhaseId,
					label: 'Festival',
					icon: '🎉',
					steps: [{ id: 'phase:festival:step' }],
				},
			],
			configureMetadata(metadata) {
				metadata.phases = {
					...metadata.phases,
					[festivalPhaseId]: {
						id: festivalPhaseId,
						label: 'Festival',
						icon: '🎉',
					},
				};
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:festival',
				name: 'Festival Spirit',
				icon: '✨',
				durationPhaseId: 'phase:festival',
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], context);
		const description = describeEffects([passive], context);
		const log = logEffects([passive], context);
		const festivalPhase = context.phases.find(
			(phase) => phase.id === festivalPhaseId,
		);
		const durationLabel = formatDurationLabel(
			festivalPhase?.label,
			festivalPhase?.icon,
		);

		expect(summary).toEqual([
			{ title: `⏳ Until next ${durationLabel}`, items: [] },
		]);
		expect(description).toEqual([
			{
				title: `✨ Festival Spirit – Until your next ${durationLabel}`,
				items: [],
			},
		]);
		expect(log).toEqual([
			{
				title: '✨ Festival Spirit added',
				items: [
					`✨ Festival Spirit duration: Until player's next ${durationLabel}`,
				],
			},
		]);
	});

	it('fills missing context metadata from static phase definitions', () => {
		const scaffold = createTestSessionScaffold();
		const growthPhase = scaffold.phases.find((phase) =>
			phase.id.includes('growth'),
		);
		expect(growthPhase).toBeDefined();
		const context = createFormatterContext({
			phases: growthPhase ? [growthPhase] : scaffold.phases,
			configureMetadata(metadata) {
				if (growthPhase) {
					delete metadata.phases?.[growthPhase.id];
				}
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:static-growth',
				durationPhaseId: growthPhase?.id ?? 'phase.growth',
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], context);
		const resolvedPhase = context.phases.find(
			(phase) => phase.id === (growthPhase?.id ?? 'phase.growth'),
		);
		const durationLabel = formatDurationLabel(
			resolvedPhase?.label,
			resolvedPhase?.icon,
		);

		expect(summary).toEqual([
			{ title: `⏳ Until next ${durationLabel}`, items: [] },
		]);
	});

	it('prefers contextual metadata over static phase definitions', () => {
		const scaffold = createTestSessionScaffold();
		const growthPhase = scaffold.phases.find((phase) =>
			phase.id.includes('growth'),
		);
		const growthId = growthPhase?.id ?? 'phase.growth';
		const context = createFormatterContext({
			phases: [
				{
					id: growthId,
					label: 'Rapid Growth',
					icon: '🌱',
					steps: [{ id: `${growthId}:step` }],
				},
			],
			configureMetadata(metadata) {
				metadata.phases = {
					...metadata.phases,
					[growthId]: { id: growthId },
				};
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:context-growth',
				durationPhaseId: growthId,
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], context);
		const resolvedPhase = context.phases.find((phase) => phase.id === growthId);
		const durationLabel = formatDurationLabel(
			resolvedPhase?.label,
			resolvedPhase?.icon,
		);

		expect(summary).toEqual([
			{ title: `⏳ Until next ${durationLabel}`, items: [] },
		]);
	});

	it('resolves phase metadata via trigger keys when duration id is missing', () => {
		const upkeepPhaseId = 'phase:upkeep';
		const context = createFormatterContext({
			phases: [
				{
					id: upkeepPhaseId,
					label: 'Rest & Recover',
					icon: '🛏️',
					steps: [
						{
							id: 'custom:upkeep',
							triggers: ['onUpkeepPhase'],
						},
					],
				},
			],
			configureMetadata(metadata) {
				metadata.phases = {
					...metadata.phases,
					[upkeepPhaseId]: {
						id: upkeepPhaseId,
						label: 'Rest & Recover',
						icon: '🛏️',
					},
				};
				metadata.triggers = {
					...metadata.triggers,
					onUpkeepPhase: {
						past: 'Upkeep',
						future: 'During Upkeep',
						icon: '🛏️',
					},
				};
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:trigger-upkeep',
				onUpkeepPhase: [],
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], context);
		const resolvedPhase = context.phases.find(
			(phase) => phase.id === upkeepPhaseId,
		);
		const durationLabel = formatDurationLabel(
			resolvedPhase?.label,
			resolvedPhase?.icon,
		);

		expect(summary).toEqual([
			{ title: `⏳ Until next ${durationLabel}`, items: [] },
		]);
	});
});
