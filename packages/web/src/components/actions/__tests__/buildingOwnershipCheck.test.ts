import { describe, expect, it } from 'vitest';
import type { ActionConfig } from '@kingdom-builder/protocol';
import {
	extractBuildingIdFromAction,
	isBuildingAlreadyOwned,
} from '../buildingOwnershipCheck';

describe('buildingOwnershipCheck', () => {
	describe('extractBuildingIdFromAction', () => {
		it('returns undefined for undefined action config', () => {
			expect(extractBuildingIdFromAction(undefined)).toBeUndefined();
		});

		it('returns undefined for action with no effects', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBeUndefined();
		});

		it('returns undefined for action without building:add effect', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [
					{ type: 'resource', method: 'change', params: { amount: 5 } },
				],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBeUndefined();
		});

		it('extracts building ID from building:add effect', () => {
			const action = {
				id: 'build_mill',
				name: 'Build Mill',
				effects: [{ type: 'building', method: 'add', params: { id: 'mill' } }],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBe('mill');
		});

		it('returns first building ID when multiple building:add effects exist', () => {
			const action = {
				id: 'build_combo',
				name: 'Build Combo',
				effects: [
					{ type: 'building', method: 'add', params: { id: 'mill' } },
					{ type: 'building', method: 'add', params: { id: 'market' } },
				],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBe('mill');
		});

		it('skips effect groups (with options property)', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [
					{
						id: 'group',
						title: 'Choose',
						options: [{ id: 'opt1', label: 'Option 1', actionId: 'test' }],
					},
					{ type: 'building', method: 'add', params: { id: 'mill' } },
				],
			} as unknown as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBe('mill');
		});

		it('returns undefined if building:add has no id param', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [{ type: 'building', method: 'add', params: {} }],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBeUndefined();
		});

		it('ignores building effects with method other than add', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [
					{ type: 'building', method: 'remove', params: { id: 'mill' } },
				],
			} as ActionConfig;
			expect(extractBuildingIdFromAction(action)).toBeUndefined();
		});
	});

	describe('isBuildingAlreadyOwned', () => {
		it('returns false for undefined action config', () => {
			const playerBuildings = new Set(['mill']);
			expect(isBuildingAlreadyOwned(undefined, playerBuildings)).toBe(false);
		});

		it('returns false for action without building:add effect', () => {
			const action = {
				id: 'test',
				name: 'Test',
				effects: [
					{ type: 'resource', method: 'change', params: { amount: 5 } },
				],
			} as ActionConfig;
			const playerBuildings = new Set(['mill']);
			expect(isBuildingAlreadyOwned(action, playerBuildings)).toBe(false);
		});

		it('returns false when player does not own the building', () => {
			const action = {
				id: 'build_mill',
				name: 'Build Mill',
				effects: [{ type: 'building', method: 'add', params: { id: 'mill' } }],
			} as ActionConfig;
			const playerBuildings = new Set(['market', 'barracks']);
			expect(isBuildingAlreadyOwned(action, playerBuildings)).toBe(false);
		});

		it('returns true when player already owns the building', () => {
			const action = {
				id: 'build_mill',
				name: 'Build Mill',
				effects: [{ type: 'building', method: 'add', params: { id: 'mill' } }],
			} as ActionConfig;
			const playerBuildings = new Set(['mill', 'market']);
			expect(isBuildingAlreadyOwned(action, playerBuildings)).toBe(true);
		});

		it('returns false when player has no buildings', () => {
			const action = {
				id: 'build_mill',
				name: 'Build Mill',
				effects: [{ type: 'building', method: 'add', params: { id: 'mill' } }],
			} as ActionConfig;
			const playerBuildings = new Set<string>();
			expect(isBuildingAlreadyOwned(action, playerBuildings)).toBe(false);
		});
	});
});
