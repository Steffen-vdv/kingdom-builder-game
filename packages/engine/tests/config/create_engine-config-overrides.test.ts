import { describe, expect, it } from 'vitest';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import type { GameConfig, StartConfig } from '@kingdom-builder/protocol';
import { createEngine, ResourceV2Parent } from '../../src/index.ts';

function cloneStartConfig(): StartConfig {
	return JSON.parse(JSON.stringify(GAME_START));
}

describe('createEngine configuration overrides', () => {
	it('replaces registries when overrides are provided in the game config', () => {
		const factory = createContentFactory();
		const action = factory.action();
		const building = factory.building();
		const development = factory.development();
		const population = factory.population();

		const config: GameConfig = {
			start: cloneStartConfig(),
			actions: [action],
			buildings: [building],
			developments: [development],
			populations: [population],
		};

		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			config,
		});

		expect(engine.actions).not.toBe(ACTIONS);
		expect(engine.actions.keys()).toEqual([action.id]);
		expect(engine.buildings).not.toBe(BUILDINGS);
		expect(engine.buildings.keys()).toEqual([building.id]);
		expect(engine.developments).not.toBe(DEVELOPMENTS);
		expect(engine.developments.keys()).toEqual([development.id]);
		expect(engine.populations).not.toBe(POPULATIONS);
		expect(engine.populations.keys()).toEqual([population.id]);
	});

	it('retains existing registries when overrides are empty', () => {
		const config: GameConfig = {
			start: cloneStartConfig(),
			actions: [],
			buildings: [],
			developments: [],
			populations: [],
		};

		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			config,
		});

		expect(engine.actions).toBe(ACTIONS);
		expect(engine.buildings).toBe(BUILDINGS);
		expect(engine.developments).toBe(DEVELOPMENTS);
		expect(engine.populations).toBe(POPULATIONS);
	});

	it('loads ResourceV2 overrides from the validated game config', () => {
		const resource = createResourceV2Definition({
			id: 'resource:override',
			group: { groupId: 'group:override', order: 1 },
		});
		const group = createResourceV2Group({
			id: 'group:override',
			children: [resource.id],
			parentId: 'parent:override',
		});
		const overrideConfig = {
			start: cloneStartConfig(),
			resourceDefinitions: [resource],
			resourceGroups: [group],
		};

		const engine = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
			config: overrideConfig as GameConfig,
		});

		const player = engine.game.players[0]!;
		expect(player.resourceV2.resourceIds).toContain(resource.id);
		expect(player.resourceV2.parentIds).toContain(group.parent.id);
		expect(Object.values(ResourceV2Parent ?? {})).toContain(group.parent.id);
	});
});
