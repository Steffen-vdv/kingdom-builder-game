import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	LAND_INFO,
	SLOT_INFO,
	PHASES,
	RESOURCES,
	STATS,
	POPULATION_ROLES,
} from '@kingdom-builder/contents';
import { buildOverviewIconSet } from '../src/components/overview/overviewTokens';

describe('buildOverviewIconSet', () => {
	it('includes icons for ids provided by content registries', () => {
		const icons = buildOverviewIconSet();
		const actionRegistry = ACTIONS as unknown as {
			keys(): string[];
			get(id: string): { icon?: unknown };
		};
		const actionKeys = actionRegistry.keys();

		for (const id of actionKeys) {
			expect(icons[id]).toBe(actionRegistry.get(id)?.icon);
		}

		const hasOwn = (obj: Record<string, unknown>, key: string) =>
			Object.prototype.hasOwnProperty.call(obj, key);

		const uniquePhase = PHASES.find(
			(phase) =>
				!hasOwn(RESOURCES, phase.id) &&
				!hasOwn(STATS as Record<string, unknown>, phase.id) &&
				!hasOwn(POPULATION_ROLES, phase.id) &&
				!actionKeys.includes(phase.id),
		);
		expect(uniquePhase).toBeDefined();
		if (uniquePhase) {
			expect(icons[uniquePhase.id]).toBe(uniquePhase.icon);
		}

		const uniqueResource = Object.entries(RESOURCES).find(
			([id]) =>
				!PHASES.some((phase) => phase.id === id) &&
				!hasOwn(STATS as Record<string, unknown>, id) &&
				!hasOwn(POPULATION_ROLES, id) &&
				!actionKeys.includes(id),
		);
		expect(uniqueResource).toBeDefined();
		if (uniqueResource) {
			const [id, info] = uniqueResource;
			expect(icons[id]).toBe(info.icon);
		}

		const uniqueStat = Object.entries(STATS).find(
			([id]) =>
				!PHASES.some((phase) => phase.id === id) &&
				!hasOwn(RESOURCES, id) &&
				!hasOwn(POPULATION_ROLES, id) &&
				!actionKeys.includes(id),
		);
		expect(uniqueStat).toBeDefined();
		if (uniqueStat) {
			const [id, info] = uniqueStat;
			expect(icons[id]).toBe(info.icon);
		}

		Object.entries(POPULATION_ROLES).forEach(([id, info]) => {
			expect(icons[id]).toBe(info.icon);
		});

		expect(icons.land).toBe(LAND_INFO.icon);
		expect(icons.slot).toBe(SLOT_INFO.icon);
	});

	it('allows custom token keys to reference registry identifiers', () => {
		const actionRegistry = ACTIONS as unknown as {
			keys(): string[];
			get(id: string): { icon?: unknown };
		};
		const [actionId] = actionRegistry.keys();
		const alias = `alias_${actionId}`;

		const icons = buildOverviewIconSet({
			actions: {
				[alias]: actionId,
			},
		});

		expect(icons[alias]).toBe(actionRegistry.get(actionId)?.icon);
	});
});
