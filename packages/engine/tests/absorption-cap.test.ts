import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource } from '../src/state/index.ts';
import {
	RESOURCE_V2_DEFINITION_ARTIFACTS,
	ResourceV2Id,
} from '@kingdom-builder/contents';

type TestEngineContext = ReturnType<typeof createTestEngine>;
type TestPlayer = TestEngineContext['activePlayer'];

const ABSORPTION_ID = (() => {
	const definition =
		RESOURCE_V2_DEFINITION_ARTIFACTS.definitionsById[ResourceV2Id.Absorption];
	if (!definition) {
		throw new Error(
			'Missing Absorption ResourceV2 definition in startup metadata.',
		);
	}
	return definition.id;
})();

function setAbsorption(
	context: TestEngineContext,
	player: TestPlayer,
	value: number,
) {
	const current = player.resourceV2.amounts[ABSORPTION_ID] ?? 0;
	const delta = value - current;
	if (delta === 0) {
		return;
	}
	context.resourceV2.applyValueChange(context, player, ABSORPTION_ID, {
		delta,
		reconciliation: 'clamp',
	});
}

describe('absorption cap', () => {
	it('caps absorption at 100%', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		setAbsorption(engineContext, defender, 1.5);
		const start = defender.resources[Resource.castleHP];
		const result = resolveAttack(defender, 5, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(0);
		expect(defender.resources[Resource.castleHP]).toBe(start);
	});
});
