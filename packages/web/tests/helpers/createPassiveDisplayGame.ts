import { vi } from 'vitest';
import type { EngineContext, RuleSnapshot } from '@kingdom-builder/engine';
import { createTranslationContext } from '../../src/translation/context';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { ACTIONS, BUILDINGS, DEVELOPMENTS } from '@kingdom-builder/contents';

type MockGame = {
	ctx: EngineContext;
	translationContext: ReturnType<typeof createTranslationContext>;
	ruleSnapshot: RuleSnapshot;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
	resolution: null;
	showResolution: ReturnType<typeof vi.fn>;
	acknowledgeResolution: ReturnType<typeof vi.fn>;
};

type PassiveGameContext = {
	mockGame: MockGame;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
};

function createPassiveGame(ctx: EngineContext): PassiveGameContext {
	const handleHoverCard = vi.fn();
	const clearHoverCard = vi.fn();
	const ruleSnapshot: RuleSnapshot = {
		tieredResourceKey: ctx.services.rules.tieredResourceKey,
		tierDefinitions: ctx.services.rules.tierDefinitions,
	};
	const translationContext = createTranslationContext(
		snapshotEngine(ctx),
		{
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
		},
		{
			helpers: {
				pullEffectLog: (key) => ctx.pullEffectLog(key),
				evaluationMods: ctx.passives.evaluationMods,
			},
			ruleSnapshot,
			passiveRecords: new Map(
				ctx.game.players.map((player) => [
					player.id,
					ctx.passives.values(player.id),
				]),
			),
		},
	);
	const mockGame: MockGame = {
		ctx,
		translationContext,
		ruleSnapshot,
		handleHoverCard,
		clearHoverCard,
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
	};
	return { mockGame, handleHoverCard, clearHoverCard };
}

export type { MockGame, PassiveGameContext };
export { createPassiveGame };
