import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import {
	createTranslationContext,
	selectPopulationRoleDisplay,
	selectStatDisplay,
} from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];

describe('translateRequirementFailure', () => {
	const scaffold = createTestSessionScaffold();
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
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	const populationIds = scaffold.registries.populations.keys();
	const populationId =
		populationIds.find((id) => id.includes('legion')) ??
		populationIds[0] ??
		'legion';

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
		const message = translateRequirementFailure(failure, context);
		const maxPopulation = selectStatDisplay(context.assets, 'maxPopulation');
		const prefix = maxPopulation.icon ? `${maxPopulation.icon} ` : '';
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
		const message = translateRequirementFailure(failure, context);
		const statDisplay = selectStatDisplay(context.assets, 'warWeariness');
		const populationDisplay = selectPopulationRoleDisplay(
			context.assets,
			populationId,
		);
		const statLabel = [statDisplay.icon, statDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		const populationLabel = [populationDisplay.icon, populationDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
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

	it('falls back to the default population descriptor when role metadata is missing', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: {
						type: 'population',
						params: { role: 'unknown-role' },
					},
					right: 1,
					operator: 'lt',
				},
			},
			details: { right: 1 },
		};
		const message = translateRequirementFailure(failure, context);
		const fallbackDisplay = selectPopulationRoleDisplay(
			context.assets,
			undefined,
		);
		const fallbackLabel = [fallbackDisplay.icon, fallbackDisplay.label]
			.filter(Boolean)
			.join(' ')
			.trim();
		expect(message).toBe(`${fallbackLabel} must be lower than 1`);
	});
});
