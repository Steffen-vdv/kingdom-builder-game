import { describe, it, expect } from 'vitest';
import { createEngine } from '@kingdom-builder/engine';
import {
	PHASES,
	POPULATIONS,
	GAME_START,
	RULES,
	BUILDINGS,
	DEVELOPMENTS,
	createBuildingRegistry,
	createDevelopmentRegistry,
} from '@kingdom-builder/contents';
import { logContent } from '@kingdom-builder/web/translation/content';
import { createContentFactory } from '../../packages/engine/tests/factories/content';

describe('content-driven action log hooks', () => {
	it('render linked targets for actions without relying on build/develop ids', () => {
		const content = createContentFactory();
		const hall = content.building({ name: 'Custom Hall', icon: '🏯' });
		const plainHall = content.building({ name: 'Plain Hall' });
		const improvement = content.development({
			name: 'Custom Improvement',
			icon: '🌿',
		});
		const idToken = ['$', 'id'].join('');
		const landIdToken = ['$', 'landId'].join('');

		const construct = content.action({
			name: 'Construct Hall',
			icon: '🚧',
			effects: [
				{
					type: 'building',
					method: 'add',
					params: { id: idToken },
				},
			],
		});

		const establish = content.action({
			name: 'Establish Improvement',
			icon: '✨',
			effects: [
				{
					type: 'development',
					method: 'add',
					params: { id: idToken, landId: landIdToken },
				},
			],
		});

		const constructStatic = content.action({
			name: 'Construct Static Hall',
			icon: '🏗️',
			effects: [
				{
					type: 'building',
					method: 'add',
					params: { id: plainHall.id },
				},
			],
		});

		const buildings = createBuildingRegistry();
		for (const [id, def] of BUILDINGS.entries()) buildings.add(id, def);
		buildings.add(hall.id, hall);
		buildings.add(plainHall.id, plainHall);

		const developments = createDevelopmentRegistry();
		for (const [id, def] of DEVELOPMENTS.entries()) developments.add(id, def);
		developments.add(improvement.id, improvement);

		const ctx = createEngine({
			actions: content.actions,
			buildings,
			developments,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const buildingLog = logContent('action', construct.id, ctx, {
			id: hall.id,
		});
		if (hall.icon) {
			expect(buildingLog[0]).toContain(hall.icon);
		}
		expect(buildingLog[0]).toContain(hall.name);

		const landId = ctx.activePlayer.lands[0]?.id;
		const developmentLog = logContent('action', establish.id, ctx, {
			id: improvement.id,
			landId,
		});
		if (improvement.icon) {
			expect(developmentLog[0]).toContain(improvement.icon);
		}
		expect(developmentLog[0]).toContain(improvement.name);

		const staticLog = logContent('action', constructStatic.id, ctx);
		expect(staticLog[0]).toContain(plainHall.name);

		const buildingLabel = logContent('building', plainHall.id, ctx)[0];
		expect(buildingLabel).toBe(plainHall.name);
	});
});
