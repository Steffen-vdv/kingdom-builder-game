import { describe, expect, it } from 'vitest';
import {
	ACTIONS,
	ACTION_CATEGORIES,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCE_V2,
	RESOURCE_GROUPS_V2,
	ResourceV2Id,
	ResourceV2GroupId,
} from '@kingdom-builder/contents';
import { SessionManager } from '../src/session/SessionManager.js';
import {
	buildSessionAssets,
	type SessionBaseOptions,
} from '../src/session/sessionConfigAssets.js';

describe('session registries ResourceV2 integration', () => {
	it('includes cloned ResourceV2 registries sorted by order', () => {
		const manager = new SessionManager();
		const registries = manager.getRegistries();

		expect(registries.resourcesV2).toBeDefined();
		const resourceEntries = Object.entries(registries.resourcesV2 ?? {});
		expect(resourceEntries.length).toBeGreaterThan(0);

		const resourceOrders = resourceEntries.map(
			([, definition]) => definition.order,
		);
		expect(resourceOrders).toEqual([...resourceOrders].sort((a, b) => a - b));

		const goldFromPayload = registries.resourcesV2?.[ResourceV2Id.Gold];
		const goldFromSource = RESOURCE_V2[ResourceV2Id.Gold];
		expect(goldFromPayload).toBeDefined();
		expect(goldFromPayload).not.toBe(goldFromSource);
		if (goldFromPayload?.metadata && goldFromSource.metadata) {
			expect(goldFromPayload.metadata).not.toBe(goldFromSource.metadata);
		}

		expect(registries.resourceGroups).toBeDefined();
		const groupEntries = Object.entries(registries.resourceGroups ?? {});
		expect(groupEntries.length).toBeGreaterThan(0);
		const groupOrders = groupEntries.map(([, group]) => group.order);
		expect(groupOrders).toEqual([...groupOrders].sort((a, b) => a - b));

		const kingdomGroup =
			registries.resourceGroups?.[ResourceV2GroupId.KingdomCore];
		const sourceGroup = RESOURCE_GROUPS_V2[ResourceV2GroupId.KingdomCore];
		expect(kingdomGroup).toBeDefined();
		expect(kingdomGroup).not.toBe(sourceGroup);
		if (kingdomGroup?.parent && sourceGroup.parent) {
			expect(kingdomGroup.parent).not.toBe(sourceGroup.parent);
			if (kingdomGroup.parent.metadata && sourceGroup.parent.metadata) {
				expect(kingdomGroup.parent.metadata).not.toBe(
					sourceGroup.parent.metadata,
				);
			}
		}
	});

	it('omits ResourceV2 registries when base data is unavailable', () => {
		const manager = new SessionManager();
		const baseRegistries = manager.getRegistries();
		const baseMetadata = manager.getMetadata();
		const baseOptions: SessionBaseOptions = {
			actions: ACTIONS,
			actionCategories: ACTION_CATEGORIES,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		};
		const context = {
			baseOptions,
			resourceOverrides: undefined,
			baseRegistries: {
				...baseRegistries,
				resourcesV2: undefined,
				resourceGroups: undefined,
			},
			baseMetadata,
		};

		const { registries } = buildSessionAssets(context, {});
		expect(registries.resourcesV2).toBeUndefined();
		expect(registries.resourceGroups).toBeUndefined();
	});
});
