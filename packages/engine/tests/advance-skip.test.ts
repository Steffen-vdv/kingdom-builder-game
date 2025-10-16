import { describe, it, expect } from 'vitest';
import { RULES, PHASES } from '@kingdom-builder/contents';
import {
	happinessTier,
	effect,
	passiveParams,
} from '@kingdom-builder/contents/config/builders';
import {
	Types,
	PassiveMethods,
} from '@kingdom-builder/contents/config/builderShared';
import { advance } from '../src';
import { createTestEngine } from './helpers';
import type { RuleSet } from '../src/services';

const growthPhaseId = PHASES[0]?.id ?? '';
const upkeepPhase =
	PHASES.find((phase) => phase.id !== growthPhaseId) ?? PHASES[0];
const upkeepPhaseId = upkeepPhase?.id ?? '';
const warRecoveryStepId =
	upkeepPhase?.steps.find((step) => step.id.includes('war-recovery'))?.id ?? '';
const mainPhase =
	PHASES[
		(PHASES.findIndex((phase) => phase.id === upkeepPhaseId) + 1) %
			PHASES.length
	];

const phaseSummary = 'test.summary.phase';
const stepSummary = 'test.summary.step';

describe('advance skip handling', () => {
	it('skips an entire phase when markers are present', () => {
		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:skip-phase')
					.range(0, 5)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:skip-phase')
									.detail(phaseSummary)
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:skip-phase',
										},
									})
									.skipPhase(growthPhaseId)
									.build(),
							),
					)
					.text((text) => text.summary(phaseSummary))
					.build(),
			],
		};

		const engineContext = createTestEngine({ rules: customRules });
		const result = advance(engineContext);

		expect(result.effects).toHaveLength(0);
		expect(result.phase).toBe(growthPhaseId);
		expect(result.skipped?.type).toBe('phase');
		expect(result.skipped?.phaseId).toBe(growthPhaseId);
		expect(result.skipped?.sources[0]?.id).toBe(
			customRules.tierDefinitions[0]?.preview?.id,
		);
		expect(result.skipped?.sources[0]?.detail).toBe(phaseSummary);

		expect(engineContext.game.currentPhase).toBe(upkeepPhaseId);
		const firstUpkeepStep =
			PHASES.find((phase) => phase.id === upkeepPhaseId)?.steps[0]?.id ?? '';
		expect(engineContext.game.currentStep).toBe(firstUpkeepStep);
	});

	it('skips individual steps when markers are present', () => {
		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:skip-step')
					.range(0, 5)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:skip-step')
									.detail(stepSummary)
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:skip-step',
										},
									})
									.skipStep(upkeepPhaseId, warRecoveryStepId)
									.build(),
							),
					)
					.text((text) => text.summary(stepSummary))
					.build(),
			],
		};

		const engineContext = createTestEngine({ rules: customRules });
		const upkeepIndex = PHASES.findIndex((phase) => phase.id === upkeepPhaseId);
		const stepIndex =
			upkeepPhase?.steps.findIndex((step) => step.id === warRecoveryStepId) ??
			0;

		engineContext.game.phaseIndex = upkeepIndex;
		engineContext.game.currentPhase = upkeepPhaseId;
		engineContext.game.stepIndex = stepIndex;
		engineContext.game.currentStep = warRecoveryStepId;

		const result = advance(engineContext);

		expect(result.effects).toHaveLength(0);
		expect(result.phase).toBe(upkeepPhaseId);
		expect(result.step).toBe(warRecoveryStepId);
		expect(result.skipped?.type).toBe('step');
		expect(result.skipped?.phaseId).toBe(upkeepPhaseId);
		expect(result.skipped?.stepId).toBe(warRecoveryStepId);
		expect(result.skipped?.sources[0]?.detail).toBe(stepSummary);

		expect(engineContext.game.currentPhase).toBe(mainPhase?.id ?? '');
		const expectedStep = mainPhase?.steps[0]?.id ?? '';
		expect(engineContext.game.currentStep).toBe(expectedStep);
	});

	it('collects metadata for every skip source to support logging', () => {
		const customRules: RuleSet = {
			...RULES,
			tierDefinitions: [
				happinessTier('test:tier:skip-phase')
					.range(0, 5)
					.passive(
						effect()
							.type(Types.Passive)
							.method(PassiveMethods.ADD)
							.params(
								passiveParams()
									.id('test:passive:skip-phase')
									.detail(phaseSummary)
									.meta({
										source: {
											type: 'tiered-resource',
											id: 'test:tier:skip-phase',
										},
									})
									.skipPhase(growthPhaseId)
									.build(),
							),
					)
					.text((text) => text.summary(phaseSummary))
					.build(),
			],
		};

		const engineContext = createTestEngine({ rules: customRules });
		engineContext.passives.addPassive(
			{ id: 'test:passive:extra' },
			engineContext,
			{
				detail: 'Extra skip detail',
				meta: {
					source: {
						id: 'test:extra',
						icon: '🔥',
						labelToken: 'tier.extra',
					},
				},
			},
		);
		const skipBucket =
			engineContext.activePlayer.skipPhases[growthPhaseId] ?? {};
		skipBucket['test:passive:extra'] = true;
		engineContext.activePlayer.skipPhases[growthPhaseId] = skipBucket;

		const result = advance(engineContext);

		const sources = result.skipped?.sources ?? [];
		expect(result.skipped?.type).toBe('phase');
		expect(sources).toHaveLength(2);
		const byId = Object.fromEntries(
			sources.map((source) => [source.id, source]),
		);
		const tierPassiveId = customRules.tierDefinitions[0]?.preview?.id ?? '';
		expect(byId[tierPassiveId]?.detail).toBe(phaseSummary);
		expect(byId['test:passive:extra']?.detail).toBe('Extra skip detail');
		expect(byId['test:passive:extra']?.meta?.source?.icon).toBe('🔥');
		expect(byId['test:passive:extra']?.meta?.source?.labelToken).toBe(
			'tier.extra',
		);
	});
});
