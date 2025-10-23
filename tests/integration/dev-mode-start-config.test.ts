import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	loadResourceV2Registry,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	Resource,
	PopulationRole,
} from '@kingdom-builder/contents';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { StartConfig } from '@kingdom-builder/protocol';

describe('dev mode start configuration', () => {
	it('applies content-driven overrides when dev mode is enabled', () => {
		const session = createEngineSession({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			devMode: true,
		});
		const snapshot = session.getSnapshot();
		const [player, opponent] = snapshot.game.players;
		if (!player || !opponent) {
			throw new Error('Expected both players to be present at game start');
		}
		expect(snapshot.game.devMode).toBe(true);
		expect(player.resources[Resource.gold]).toBe(100);
		expect(player.resources[Resource.happiness]).toBe(10);
		expect(player.population[PopulationRole.Council]).toBe(2);
		expect(player.population[PopulationRole.Legion]).toBe(1);
		expect(player.population[PopulationRole.Fortifier]).toBe(1);
		expect(opponent.resources[Resource.castleHP]).toBe(1);
	});

	it('emits ResourceV2 snapshots with parent rollups', () => {
		const resource = createResourceV2Definition({
			id: 'integration:resource',
			group: { groupId: 'integration:group', order: 1 },
		});
		const group = createResourceV2Group({
			id: 'integration:group',
			children: [resource.id],
			parentId: 'integration:parent',
		});
		const registry = loadResourceV2Registry({
			resources: [resource],
			groups: [group],
		});
		const content = createContentFactory();
		const gain = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						id: resource.id,
						amount: 5,
					},
					meta: { reconciliation: 'clamp' },
				},
			],
		});
		const start: StartConfig = JSON.parse(JSON.stringify(GAME_START));
		const startPlayer = start.player as StartConfig['player'] & {
			resourceV2?: Record<string, number>;
		};
		startPlayer.resourceV2 = { [resource.id]: 3 };

		const session = createEngineSession({
			actions: content.actions,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start,
			rules: RULES,
			resourceV2Registry: registry,
		});

		let snapshot = session.getSnapshot();
		while (snapshot.game.currentPhase !== 'main') {
			session.advancePhase();
			snapshot = session.getSnapshot();
		}

		const player = snapshot.game.players[0]!;
		expect(player.values).toBeDefined();
		const values = player.values!;
		const parentId = group.parent.id;
		expect(Object.keys(values)).toEqual([resource.id, parentId]);
		const childValue = values[resource.id];
		const parentValue = values[parentId];
		expect(childValue?.amount).toBe(3);
		expect(parentValue?.amount).toBe(3);

		session.performAction(gain.id);
		const after = session.getSnapshot();
		const updated = after.game.players[0]!;
		const updatedValues = updated.values!;
		const updatedChild = updatedValues[resource.id];
		const updatedParent = updatedValues[parentId];
		expect(updatedChild?.amount).toBe(8);
		expect(updatedParent?.amount).toBe(8);
		expect(updatedChild?.recentGains).toEqual([
			{ resourceId: resource.id, delta: 5 },
		]);
		expect(updatedParent?.recentGains).toEqual([]);
		expect(after.recentResourceGains).toEqual(
			expect.arrayContaining([{ key: resource.id, amount: 5 }]),
		);
	});
});
