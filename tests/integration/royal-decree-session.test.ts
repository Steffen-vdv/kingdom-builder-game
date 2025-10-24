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
	buildResourceCatalogV2,
} from '@kingdom-builder/contents';

interface EffectGroupOption {
	id: string;
	actionId: string;
	params?: Record<string, unknown>;
}

interface EffectGroup {
	id: string;
	options: EffectGroupOption[];
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
			resourceCatalogV2: buildResourceCatalogV2(),
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
		const developmentIdByOption = new Map<string, string>();
		for (const option of options) {
			const nestedAction = ACTIONS.get(option.actionId);
			if (!nestedAction) {
				throw new Error(
					`Missing nested action definition for id "${option.actionId}".`,
				);
			}
			const nestedDevelopmentEffect = nestedAction.effects.find(
				(candidate) =>
					candidate.type === 'development' && candidate.method === 'add',
			);
			if (!nestedDevelopmentEffect) {
				throw new Error(
					`Missing development:add effect for action "${nestedAction.id}".`,
				);
			}
			const developmentParams = nestedDevelopmentEffect.params as {
				id?: unknown;
				developmentId?: unknown;
			};
			const effectDevelopmentId =
				typeof developmentParams.id === 'string'
					? developmentParams.id
					: typeof developmentParams.developmentId === 'string'
						? developmentParams.developmentId
						: undefined;
			if (!effectDevelopmentId) {
				throw new Error(
					`Missing development id for action "${nestedAction.id}".`,
				);
			}
			developmentIdByOption.set(option.id, effectDevelopmentId);
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
			const developmentId = developmentIdByOption.get(option.id);
			expect(developmentId).toBeDefined();
			expect(newest?.developments).toContain(developmentId);
		}
	});
});
