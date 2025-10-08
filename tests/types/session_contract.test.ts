import { describe, expectTypeOf, it } from 'vitest';
import type {
	AdvanceSkipSnapshot,
	AdvanceSkipSourceSnapshot,
	ActionDefinitionSummary,
	EngineAdvanceResult,
	EngineSessionGetActionCosts,
	EngineSessionGetActionRequirements,
	EngineSessionSnapshot,
	GameConclusionSnapshot,
	GameSnapshot,
	LandSnapshot,
	PassiveRecordSnapshot,
	PlayerStateSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionAdvanceSkipSnapshot,
	SessionAdvanceSkipSourceSnapshot,
	SessionGameConclusionSnapshot,
	SessionGameSnapshot,
	SessionLandSnapshot,
	SessionPassiveRecordSnapshot,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';

function expectMatchBoth<Left, Right>() {
	expectTypeOf<Left>().toMatchTypeOf<Right>();
	expectTypeOf<Right>().toMatchTypeOf<Left>();
}

describe('protocol session contracts', () => {
	it('matches engine snapshot shapes', () => {
		expectMatchBoth<EngineSessionSnapshot, SessionSnapshot>();
		expectMatchBoth<GameSnapshot, SessionGameSnapshot>();
		// prettier-ignore
		expectMatchBoth<
                        GameConclusionSnapshot,
                        SessionGameConclusionSnapshot
                >();
		// prettier-ignore
		expectMatchBoth<
                        PlayerStateSnapshot,
                        SessionPlayerStateSnapshot
                >();
		expectMatchBoth<LandSnapshot, SessionLandSnapshot>();
		// prettier-ignore
		expectMatchBoth<
                        AdvanceSkipSourceSnapshot,
                        SessionAdvanceSkipSourceSnapshot
                >();
		expectMatchBoth<AdvanceSkipSnapshot, SessionAdvanceSkipSnapshot>();
		expectMatchBoth<EngineAdvanceResult, SessionAdvanceResult>();
		expectMatchBoth<RuleSnapshot, SessionRuleSnapshot>();
		expectMatchBoth<PassiveRecordSnapshot, SessionPassiveRecordSnapshot>();
	});

	it('matches engine action contract shapes', () => {
		expectMatchBoth<
			ReturnType<EngineSessionGetActionCosts>,
			SessionActionCostMap
		>();
		expectMatchBoth<
			ReturnType<EngineSessionGetActionRequirements>,
			SessionActionRequirementList
		>();
		// prettier-ignore
		expectMatchBoth<
                        ActionDefinitionSummary,
                        SessionActionDefinitionSummary
                >();
	});
});
