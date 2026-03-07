import { describe, it, expect } from 'vitest';
import { createEngineSession } from '@kingdom-builder/engine';
import {
	ACTIONS,
	ACTION_META_CATEGORIES,
	ActionId,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RULES,
	Resource,
	getResourceId,
	type ResourceKey,
	RESOURCE_REGISTRY,
	RESOURCE_GROUP_REGISTRY,
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
			actionMetaCategories: ACTION_META_CATEGORIES,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			phases: PHASES,
			rules: RULES,
			resourceCatalog: {
				resources: RESOURCE_REGISTRY,
				groups: RESOURCE_GROUP_REGISTRY,
			},
		});
		let snapshot = session.getSnapshot();
		while (snapshot.game.currentPhase !== 'main') {
			session.advancePhase();
			snapshot = session.getSnapshot();
		}
		const goldId = getResourceId(Resource.gold);
		expect(snapshot.game.resourceCatalog.resources.byId[goldId]).toBeDefined();
		expect(snapshot.game.players[0]?.values[goldId]).toBeDefined();
		const playerId = snapshot.game.players[0]!.id;
		// Upgrade Royal Decree to tier 2 so effect groups are available
		session.applyDeveloperPreset({
			playerId,
			actionTiers: [{ actionId: ActionId.royal_decree, tier: 2 }],
		});
		// Royal Decree's development choices are in tier 2
		const withGroup = ACTIONS.entries().find(([, def]) => {
			const effects = def.tiers?.['2']?.effects ?? [];
			return effects.some(isEffectGroup);
		});
		if (!withGroup) {
			throw new Error('Expected an action with effect groups');
		}
		const [royalActionId, royalDecree] = withGroup;
		const royalEffects = royalDecree.tiers?.['2']?.effects ?? [];
		const developGroup = royalEffects.find(isEffectGroup);
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
			const nestedEffects = nestedAction.tiers?.['1']?.effects ?? [];
			const nestedDevelopmentEffect = nestedEffects.find(
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
		for (const option of options) {
			session.applyDeveloperPreset({
				playerId,
				resources: [
					{
						resourceId: Resource.gold as ResourceKey,
						target: 12,
					},
					{
						resourceId: Resource.cp as ResourceKey,
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
