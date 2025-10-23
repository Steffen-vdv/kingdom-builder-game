import { describe, it, expect } from 'vitest';
import {
	createEngineSession,
	loadResourceV2Registry,
	type EngineSession,
} from '@kingdom-builder/engine';
import { PHASES, GAME_START, RULES, PhaseId } from '@kingdom-builder/contents';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import type { StartConfig } from '@kingdom-builder/protocol';

function advanceToMain(session: EngineSession) {
	const limit = PHASES.length * 10;
	for (let step = 0; step < limit; step += 1) {
		const snapshot = session.getSnapshot();
		if (snapshot.game.currentPhase === PhaseId.Main) {
			return;
		}
		session.advancePhase();
	}
	throw new Error('Failed to reach main phase');
}

describe('ResourceV2 snapshot serialization', () => {
	it('emits ordered child values, parent rollups, and recent gain history', () => {
		const content = createContentFactory();
		const child = createResourceV2Definition({
			id: 'resource:alpha',
			name: 'Alpha',
			group: { groupId: 'group:pair', order: 2 },
		});
		const sibling = createResourceV2Definition({
			id: 'resource:beta',
			name: 'Beta',
			group: { groupId: 'group:pair', order: 1 },
		});
		const group = createResourceV2Group({
			id: 'group:pair',
			children: [sibling.id, child.id],
			parentId: 'parent:pair',
			parentName: 'Parent Pair',
			parentDescription: 'Parent descriptor',
		});
		const registry = loadResourceV2Registry({
			resources: [sibling, child],
			groups: [group],
		});
		const addResource = content.action({
			id: 'action:add-resource',
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { id: child.id, amount: 2 },
					meta: { reconciliation: 'clamp' },
				},
			],
		});
		const start = JSON.parse(JSON.stringify(GAME_START)) as StartConfig;
		(
			start.player as StartConfig['player'] & {
				resourceV2?: Record<string, number>;
			}
		).resourceV2 = {
			[child.id]: 1,
			[sibling.id]: 4,
		};
		const session = createEngineSession({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: PHASES,
			start,
			rules: RULES,
			resourceV2Registry: registry,
		});
		advanceToMain(session);

		const before = session.getSnapshot();
		const beforeValues = before.game.players[0]!.values ?? {};
		expect(Object.keys(beforeValues)).toEqual([
			sibling.id,
			child.id,
			group.parent.id,
		]);
		expect(beforeValues[group.parent.id]?.amount).toBe(
			(beforeValues[child.id]?.amount ?? 0) +
				(beforeValues[sibling.id]?.amount ?? 0),
		);

		session.performAction(addResource.id);
		const after = session.getSnapshot();
		const afterValues = after.game.players[0]!.values ?? {};
		expect(afterValues[child.id]?.recentGains).toEqual([
			{ resourceId: child.id, delta: 2 },
		]);
		expect(afterValues[group.parent.id]?.recentGains).toEqual([]);

		const metadata = session.getSnapshot().metadata.resources ?? {};
		expect(metadata[child.id]).toMatchObject({
			label: child.display.name,
		});
		expect(metadata[group.parent.id]).toMatchObject({
			label: group.parent.display.name,
			description: group.parent.display.description,
		});
	});
});
