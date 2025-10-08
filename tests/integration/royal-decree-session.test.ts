import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	Resource,
	type ResourceKey,
} from '@kingdom-builder/contents';

interface EffectGroup {
	id: string;
	options: { id: string; params?: Record<string, unknown> }[];
}

function isEffectGroup(effect: unknown): effect is EffectGroup {
	return (
		typeof effect === 'object' &&
		effect !== null &&
		Array.isArray((effect as { options?: unknown }).options)
	);
}

describe('royal decree via session', () => {
	it('resolves every development option', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		let snapshot = session.getSnapshot();
		while (snapshot.game.currentPhase !== 'main') {
			session.advancePhase();
			snapshot = session.getSnapshot();
		}
		const withGroup = ACTIONS.entries().find(([, def]) =>
			def.effects.some(isEffectGroup),
		);
		if (!withGroup) {
			throw new Error('Expected an action with effect groups');
		}
		const [royalActionId, royalDecree] = withGroup;
		const developGroup = royalDecree.effects.find(isEffectGroup);
		expect(developGroup).toBeDefined();
		const options = developGroup?.options ?? [];
		expect(options.length).toBeGreaterThan(0);
		for (const option of options) {
			expect(option.params?.['developmentId']).toBeDefined();
		}
		const playerId = snapshot.game.players[0]!.id;
		for (const option of options) {
			session.applyDeveloperPreset({
				playerId,
				resources: [
					{
						key: Resource.gold as ResourceKey,
						target: 12,
					},
					{
						key: Resource.ap as ResourceKey,
						target: 1,
					},
				],
			});
			const before = session.getSnapshot();
			const beforePlayer = before.game.players[0]!;
			const beforeLands = beforePlayer.lands.length;
			const newestBefore = beforePlayer.lands.at(-1);
			const optionId = option.id;
			session.performAction(royalActionId, {
				choices: { [developGroup!.id]: { optionId } },
			});
			const after = session.getSnapshot();
			const afterPlayer = after.game.players[0]!;
			expect(afterPlayer.lands.length).toBe(beforeLands + 1);
			const newest = afterPlayer.lands.at(-1);
			expect(newest).not.toBe(newestBefore);
			expect(newest?.developments).toContain(option.params?.['developmentId']);
		}
	});
});
