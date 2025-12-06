import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];

// ResourceV2 IDs for test fixtures
const RESOURCE_IDS = {
	maxPopulation: 'resource:stat:max-population',
	warWeariness: 'resource:stat:war-weariness',
	legion: 'resource:population:role:legion',
} as const;

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

	it('formats resource comparisons with ResourceV2 metadata', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: {
						type: 'resource',
						params: { resourceId: RESOURCE_IDS.warWeariness },
					},
					right: {
						type: 'resource',
						params: { resourceId: RESOURCE_IDS.legion },
					},
					operator: 'lt',
				},
			},
			details: { left: 2, right: 1 },
		};
		const message = translateRequirementFailure(failure, context);
		const warMeta = context.resourceMetadataV2.get(RESOURCE_IDS.warWeariness);
		const legionMeta = context.resourceMetadataV2.get(RESOURCE_IDS.legion);
		const warLabel = [warMeta.icon, warMeta.label].filter(Boolean).join(' ');
		const legionLabel = [legionMeta.icon, legionMeta.label]
			.filter(Boolean)
			.join(' ');
		expect(message).toBe(
			`${warLabel} (2) must be lower than ${legionLabel} (1)`,
		);
	});

	it('formats capacity comparisons using resource labels', () => {
		// The generic formatting produces clear messages like:
		// "🎖️ Legion (3) must be lower than 👥 Max Population (3)"
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: {
						type: 'resource',
						params: { resourceId: RESOURCE_IDS.legion },
					},
					right: {
						type: 'resource',
						params: { resourceId: RESOURCE_IDS.maxPopulation },
					},
					operator: 'lt',
				},
			},
			details: { left: 3, right: 3 },
		};
		const message = translateRequirementFailure(failure, context);
		const legionMeta = context.resourceMetadataV2.get(RESOURCE_IDS.legion);
		const maxPopMeta = context.resourceMetadataV2.get(
			RESOURCE_IDS.maxPopulation,
		);
		const legionLabel = [legionMeta.icon, legionMeta.label]
			.filter(Boolean)
			.join(' ');
		const maxPopLabel = [maxPopMeta.icon, maxPopMeta.label]
			.filter(Boolean)
			.join(' ');
		expect(message).toBe(
			`${legionLabel} (3) must be lower than ${maxPopLabel} (3)`,
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

	it('falls back to Value label when resourceId is missing', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: {
						type: 'resource',
						params: {},
					},
					right: 1,
					operator: 'lt',
				},
			},
			details: { right: 1 },
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Value must be lower than 1');
	});
});
