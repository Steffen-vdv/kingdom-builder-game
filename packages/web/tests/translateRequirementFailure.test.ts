import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context';
import type { PlayerId } from '@kingdom-builder/engine';
import {
	selectPopulationRoleDisplay,
	selectStatDisplay,
} from '../src/translation/context/assetSelectors';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];

type RequirementContextOptions = {
	decorateMetadata?: (
		metadata: ReturnType<typeof createTestSessionScaffold>['metadata'],
	) => void;
};

function createRequirementContext(options: RequirementContextOptions = {}) {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	options.decorateMetadata?.(metadata);
	const players = [
		createSnapshotPlayer({ id: 'A' as PlayerId }),
		createSnapshotPlayer({ id: 'B' as PlayerId }),
	];
	const session = createSessionSnapshot({
		players,
		activePlayerId: players[0].id,
		opponentId: players[1].id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	return createTranslationContext(session, scaffold.registries, metadata, {
		ruleSnapshot: scaffold.ruleSnapshot,
		passiveRecords: session.passiveRecords,
	});
}

describe('translateRequirementFailure', () => {
	const context = createRequirementContext();

	it('describes population capacity failures with current and max values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'population' },
					right: { type: 'stat', params: { key: 'maxPopulation' } },
					operator: 'lt',
				},
			},
			details: { left: 3, right: 3 },
		};
		const statDisplay = selectStatDisplay(context.assets, 'maxPopulation');
		const prefix = statDisplay.icon ? `${statDisplay.icon} ` : '';
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe(`${prefix}Population is at capacity (3/3)`);
	});

	it('formats stat versus population comparisons with icons and values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'stat', params: { key: 'warWeariness' } },
					right: {
						type: 'population',
						params: { role: 'legion' },
					},
					operator: 'lt',
				},
			},
			details: { left: 2, right: 1 },
		};
		const statDisplay = selectStatDisplay(context.assets, 'warWeariness');
		const populationDisplay = selectPopulationRoleDisplay(
			context.assets,
			'legion',
		);
		const statLabel = [statDisplay.icon, statDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const populationLabel = [populationDisplay.icon, populationDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe(
			`${statLabel} (2) must be lower than ${populationLabel} (1)`,
		);
	});

	it('returns a generic message for unknown requirement types', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'test' },
			details: { message: 'Requires special condition' },
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Requirement not met');
	});

	it('falls back to the failure message when translation is unavailable', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'fallback' },
			message: 'Custom fallback text',
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Custom fallback text');
	});

	it('ignores legacy requirement message fields to keep messaging in web', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'custom',
				method: 'legacy',
				message: 'Legacy text',
			} as unknown as RequirementFailure['requirement'],
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Requirement not met');
	});

	it('falls back to generic population labels when role metadata is missing', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'stat', params: { key: 'warWeariness' } },
					right: { type: 'population', params: { role: 'unknown-role' } },
					operator: 'lt',
				},
			},
			details: { left: 2, right: 1 },
		};
		const statDisplay = selectStatDisplay(context.assets, 'warWeariness');
		const fallbackPopulation = selectPopulationRoleDisplay(
			context.assets,
			'unknown-role',
		);
		const statLabel = [statDisplay.icon, statDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const populationLabel = [fallbackPopulation.icon, fallbackPopulation.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe(
			`${statLabel} (2) must be lower than ${populationLabel} (1)`,
		);
	});
});
