import { describe, it, expect } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import type { EffectDef, SessionPlayerId } from '@kingdom-builder/protocol';
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
		id: 'player:active' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as SessionPlayerId,
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

		// New split format: add entry + remove entry under trigger
		const passiveIcon = '✨';
		const passiveName = 'Festival Spirit';
		expect(summary).toEqual([
			{ title: `+♾️: ${passiveIcon} ${passiveName}`, items: [] },
			{
				title: `On your ${festivalPhase?.icon} ${festivalPhase?.label} Phase`,
				items: [`-♾️: ${passiveIcon} ${passiveName}`],
			},
		]);
		expect(description).toEqual([
			{ title: `Gain ♾️ Passive: ${passiveIcon} ${passiveName}`, items: [] },
			{
				title: `On your ${festivalPhase?.icon} ${festivalPhase?.label} Phase`,
				items: [`Remove ♾️ Passive: ${passiveIcon} ${passiveName}`],
			},
		]);
		expect(log).toEqual([
			{
				title: `♾️ ${passiveIcon} ${passiveName} activated`,
				items: [
					`${passiveIcon} Duration: Until player's next ${durationLabel}`,
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

		// New split format - passive uses descriptor defaults for icon/name
		const phaseLabel = `${resolvedPhase?.icon} ${resolvedPhase?.label}`;
		const passiveAsset = context.assets.passive ?? {};
		const passiveIcon = passiveAsset.icon ?? '♾️';
		const passiveName = passiveAsset.label ?? 'Passive';
		const passiveDisplay = passiveIcon
			? `${passiveIcon} ${passiveName}`
			: passiveName;
		expect(summary).toEqual([
			{ title: `+♾️: ${passiveDisplay}`, items: [] },
			{
				title: `On your ${phaseLabel} Phase`,
				items: [`-♾️: ${passiveDisplay}`],
			},
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

		// New split format - passive uses descriptor defaults for icon/name
		const phaseLabel = `${resolvedPhase?.icon} ${resolvedPhase?.label}`;
		const passiveAsset = context.assets.passive ?? {};
		const passiveIcon = passiveAsset.icon ?? '♾️';
		const passiveName = passiveAsset.label ?? 'Passive';
		const passiveDisplay = passiveIcon
			? `${passiveIcon} ${passiveName}`
			: passiveName;
		expect(summary).toEqual([
			{ title: `+♾️: ${passiveDisplay}`, items: [] },
			{
				title: `On your ${phaseLabel} Phase`,
				items: [`-♾️: ${passiveDisplay}`],
			},
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
							triggers: ['onPayUpkeepStep'],
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
					onPayUpkeepStep: {
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
				onPayUpkeepStep: [],
			},
			effects: [],
		};

		const summary = summarizeEffects([passive], context);
		const resolvedPhase = context.phases.find(
			(phase) => phase.id === upkeepPhaseId,
		);

		// New split format - passive uses descriptor defaults for icon/name
		const phaseLabel = `${resolvedPhase?.icon} ${resolvedPhase?.label}`;
		const passiveAsset = context.assets.passive ?? {};
		const passiveIcon = passiveAsset.icon ?? '♾️';
		const passiveName = passiveAsset.label ?? 'Passive';
		const passiveDisplay = passiveIcon
			? `${passiveIcon} ${passiveName}`
			: passiveName;
		expect(summary).toEqual([
			{ title: `+♾️: ${passiveDisplay}`, items: [] },
			{
				title: `On your ${phaseLabel} Phase`,
				items: [`-♾️: ${passiveDisplay}`],
			},
		]);
	});
});
