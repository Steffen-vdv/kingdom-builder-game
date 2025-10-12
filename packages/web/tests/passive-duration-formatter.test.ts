import { describe, it, expect, vi } from 'vitest';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import type {
	EffectDef,
	PlayerId,
	EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import {
	createTranslationContext,
	type TranslationContext,
	type TranslationPhase,
} from '../src/translation/context';
import { createTestRegistryMetadata } from './helpers/registryMetadata';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

type PassiveContextOptions = {
	phases?: EngineSessionSnapshot['phases'];
	decorateMetadata?: (metadata: EngineSessionSnapshot['metadata']) => void;
};

function createPassiveContext(options: PassiveContextOptions = {}): {
	context: TranslationContext;
	phases: TranslationPhase[];
	metadata: EngineSessionSnapshot['metadata'];
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
} {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	options.decorateMetadata?.(metadata);
	const phases = options.phases ?? scaffold.phases;
	const players = [
		createSnapshotPlayer({ id: 'A' as PlayerId }),
		createSnapshotPlayer({ id: 'B' as PlayerId }),
	];
	const session = createSessionSnapshot({
		players,
		activePlayerId: players[0].id,
		opponentId: players[1].id,
		phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		metadata,
		{
			ruleSnapshot: scaffold.ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		scaffold.registries,
		metadata,
	);
	return {
		context,
		phases: context.phases,
		metadata,
		metadataSelectors,
	};
}

describe('passive formatter duration metadata', () => {
	it('uses custom phase metadata when provided', () => {
		const phaseId = 'phase:festival';
		const festivalPhase: EngineSessionSnapshot['phases'][number] = {
			id: phaseId,
			label: 'Festival',
			icon: '🎉',
			steps: [{ id: 'phase:festival:step' }],
		};
		const { context, metadataSelectors } = createPassiveContext({
			phases: [festivalPhase],
			decorateMetadata(metadata) {
				metadata.phases = {
					...metadata.phases,
					[phaseId]: {
						id: phaseId,
						label: festivalPhase.label,
						icon: festivalPhase.icon,
						steps: festivalPhase.steps,
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
				durationPhaseId: phaseId,
			},
			effects: [],
		};
		const phaseDescriptor = metadataSelectors.phaseMetadata.select(phaseId);
		const formattedPhaseLabel = [phaseDescriptor.icon, phaseDescriptor.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const summary = summarizeEffects([passive], context);
		const description = describeEffects([passive], context);
		const log = logEffects([passive], context);
		expect(summary).toEqual([
			{ title: `⏳ Until next ${formattedPhaseLabel}`, items: [] },
		]);
		expect(description).toEqual([
			{
				title: `✨ Festival Spirit – Until your next ${formattedPhaseLabel}`,
				items: [],
			},
		]);
		expect(log).toEqual([
			{
				title: '✨ Festival Spirit added',
				items: [
					`✨ Festival Spirit duration: Until player's next ${formattedPhaseLabel}`,
				],
			},
		]);
	});

	it('fills missing context metadata from static phase definitions', () => {
		const { context, metadataSelectors } = createPassiveContext({
			phases: [{ id: 'phase.growth' }, { id: 'phase.upkeep' }],
			decorateMetadata(metadata) {
				metadata.phases = {
					['phase.growth']: { id: 'phase.growth' },
					['phase.upkeep']: { id: 'phase.upkeep' },
				};
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:static-growth',
				durationPhaseId: 'phase.growth',
			},
			effects: [],
		};
		const descriptor = metadataSelectors.phaseMetadata.select('phase.growth');
		const fallbackSegment = descriptor.id?.split('.').pop() ?? descriptor.id;
		const label = `Phase.${fallbackSegment}`;
		const summary = summarizeEffects([passive], context);
		expect(summary).toEqual([{ title: `⏳ Until next ${label}`, items: [] }]);
	});

	it('prefers contextual metadata over static phase definitions', () => {
		const contextualPhase: EngineSessionSnapshot['phases'][number] = {
			id: 'phase.growth',
			label: 'Rapid Growth',
			icon: '🌱',
		};
		const { context, metadataSelectors } = createPassiveContext({
			phases: [contextualPhase],
			decorateMetadata(metadata) {
				metadata.phases = {
					['phase.growth']: { id: 'phase.growth', label: 'Growth Phase' },
				};
			},
		});
		const passive: EffectDef = {
			type: 'passive',
			method: 'add',
			params: {
				id: 'synthetic:passive:context-growth',
				durationPhaseId: 'phase.growth',
			},
			effects: [],
		};
		const metadataLabel =
			metadataSelectors.phaseMetadata.select('phase.growth').label;
		const contextualLabel = context.phases.find(
			(phase) => phase.id === 'phase.growth',
		)?.label;
		expect(contextualLabel).not.toBe(metadataLabel);
		const summary = summarizeEffects([passive], context);
		expect(summary).toEqual([
			{
				title: `⏳ Until next ${contextualPhase.icon} ${contextualPhase.label}`,
				items: [],
			},
		]);
	});

	it('resolves phase metadata via trigger keys when duration id is missing', () => {
		const triggerPhase: EngineSessionSnapshot['phases'][number] = {
			id: 'phase.upkeep',
			label: 'Rest & Recover',
			icon: '🛏️',
			steps: [
				{
					id: 'custom:upkeep',
					triggers: ['onUpkeepPhase'],
				},
			],
		};
		const { context, metadataSelectors } = createPassiveContext({
			phases: [triggerPhase],
			decorateMetadata(metadata) {
				metadata.phases = {
					['phase.upkeep']: {
						id: 'phase.upkeep',
						label: triggerPhase.label,
						icon: triggerPhase.icon,
						steps: triggerPhase.steps,
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
		const descriptor = metadataSelectors.phaseMetadata.select('phase.upkeep');
		const label = [descriptor.icon, descriptor.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const summary = summarizeEffects([passive], context);
		expect(summary).toEqual([{ title: `⏳ Until next ${label}`, items: [] }]);
	});
});
