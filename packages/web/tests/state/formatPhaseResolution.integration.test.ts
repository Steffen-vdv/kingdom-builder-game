import { describe, it, expect } from 'vitest';
import {
	formatPhaseResolution,
	type PhaseResolutionFormatResult,
} from '../../src/state/formatPhaseResolution';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import type { PlayerSnapshot } from '../../src/translation';
import type { EngineAdvanceResult } from '@kingdom-builder/engine';
import type {
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import { createDefaultTranslationAssets } from '../helpers/translationAssets';
import { createSessionRegistries } from '../helpers/sessionRegistries';

const translationAssets = createDefaultTranslationAssets();
const baseRegistries = createSessionRegistries();
type ResourceKey = SessionResourceDefinition['key'];

function createPlayerSnapshot(
	resources: Record<string, number> = {},
): PlayerSnapshot {
	return {
		resources,
		stats: {},
		population: {},
		buildings: [],
		lands: [],
		passives: [],
	};
}

function createSessionPlayer(
	id: string,
	name: string,
	snapshot: PlayerSnapshot,
): EngineAdvanceResult['player'] {
	return {
		id,
		name,
		resources: { ...snapshot.resources },
		stats: { ...snapshot.stats },
		statsHistory: {},
		population: { ...snapshot.population },
		lands: [],
		buildings: [],
		actions: [],
		statSources: {},
		skipPhases: {},
		skipSteps: {},
		passives: [],
	};
}

function createPhaseDefinition(): SessionPhaseDefinition {
	return {
		id: 'phase_dawn',
		label: 'Aurora',
		icon: '🌅',
		steps: [
			{
				id: 'step_prepare',
				title: 'Prepare Tribute',
				effects: [],
			},
		],
	};
}

describe('formatPhaseResolution integration', () => {
	it('describes skip events using the phase formatter', () => {
		const factory = createContentFactory();
		const phaseDefinition = createPhaseDefinition();
		const stepDefinition = phaseDefinition
			.steps[0] as SessionPhaseStepDefinition;
		const before = createPlayerSnapshot();
		const playerId = factory.action().id;
		const player = createSessionPlayer(playerId, 'Phase Herald', before);
		const advance: EngineAdvanceResult = {
			phase: phaseDefinition.id,
			step: stepDefinition.id,
			effects: [],
			player,
			skipped: {
				type: 'phase',
				phaseId: phaseDefinition.id,
				sources: [
					{
						id: factory.building().id,
						detail: 'Night watch',
					},
				],
			},
		};
		const diffContext = createTranslationDiffContext({
			activePlayer: {
				id: player.id,
				population: {},
				lands: [],
			},
			buildings: factory.buildings,
			developments: factory.developments,
			passives: { evaluationMods: new Map(), get: () => undefined },
			assets: translationAssets,
		});

		const result: PhaseResolutionFormatResult = formatPhaseResolution({
			advance,
			before,
			phaseDefinition,
			stepDefinition,
			diffContext,
		});

		expect(result.source).toEqual({
			kind: 'phase',
			label: '🌅 Aurora Phase',
			icon: '🌅',
			id: phaseDefinition.id,
			name: stepDefinition.title,
		});
		expect(result.actorLabel).toBe('Aurora Phase');
		expect(result.lines).toEqual([
			'⏭️ 🌅 Aurora Phase skipped',
			'  • Night watch',
		]);
		expect(result.summaries).toEqual(['Skipped due to: Night watch']);
	});

	it('reports no-effect steps with fallback messaging', () => {
		const factory = createContentFactory();
		const phaseDefinition = createPhaseDefinition();
		const stepDefinition = phaseDefinition
			.steps[0] as SessionPhaseStepDefinition;
		const resourceKey = (
			Object.keys(baseRegistries.resources) as ResourceKey[]
		)[0]!;
		const before = createPlayerSnapshot({ [resourceKey]: 4 });
		const after = createPlayerSnapshot({ [resourceKey]: 4 });
		const player = createSessionPlayer(
			factory.action().id,
			'Phase Runner',
			after,
		);
		const advance: EngineAdvanceResult = {
			phase: phaseDefinition.id,
			step: stepDefinition.id,
			effects: [],
			player,
		};
		const diffContext = createTranslationDiffContext({
			activePlayer: {
				id: player.id,
				population: {},
				lands: [],
			},
			buildings: factory.buildings,
			developments: factory.developments,
			passives: { evaluationMods: new Map(), get: () => undefined },
			assets: translationAssets,
		});

		const result = formatPhaseResolution({
			advance,
			before,
			after,
			phaseDefinition,
			stepDefinition,
			diffContext,
			resourceKeys: [resourceKey],
		});

		expect(result.lines).toEqual([
			'🌅 Aurora Phase – Prepare Tribute',
			'No effect',
		]);
		expect(result.summaries).toEqual(['No effect']);
	});
});
