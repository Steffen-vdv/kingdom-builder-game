/**
 * Content Reference Validation Tests
 *
 * These tests verify that all ID references in content definitions point to
 * valid, existing entities. This catches:
 * - Typos in resource/action/building/development IDs
 * - References to removed content
 * - Copy-paste errors
 *
 * Invalid references cause silent failures or runtime crashes that are
 * extremely hard to debug in production.
 */
import { describe, it, expect } from 'vitest';
import {
	createActionRegistry,
	createBuildingRegistry,
	createDevelopmentRegistry,
	buildResourceCatalog,
	Resource as CResource,
} from '@boardsmith/contents';

// Collect all valid IDs from registries
function getValidResourceIds(): Set<string> {
	const catalog = buildResourceCatalog();
	const ids = new Set<string>();
	for (const resource of catalog.resources.ordered) {
		ids.add(resource.id);
	}
	// Add group parent IDs
	for (const group of catalog.groups.ordered) {
		if (group.parent) {
			ids.add(group.parent.id);
		}
	}
	return ids;
}

function getValidActionIds(): Set<string> {
	const registry = createActionRegistry();
	const ids = new Set<string>();
	for (const action of registry.values()) {
		ids.add(action.id);
	}
	return ids;
}

function getValidBuildingIds(): Set<string> {
	const registry = createBuildingRegistry();
	const ids = new Set<string>();
	for (const building of registry.values()) {
		ids.add(building.id);
	}
	return ids;
}

function getValidDevelopmentIds(): Set<string> {
	const registry = createDevelopmentRegistry();
	const ids = new Set<string>();
	for (const dev of registry.values()) {
		ids.add(dev.id);
	}
	return ids;
}

// Recursively extract all ID references from an effect tree
type IdReference = {
	type: 'resource' | 'action' | 'building' | 'development';
	id: string;
	path: string;
};

function extractIdReferences(obj: unknown, path: string = ''): IdReference[] {
	const refs: IdReference[] = [];

	if (obj === null || obj === undefined) {
		return refs;
	}

	if (typeof obj !== 'object') {
		return refs;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			refs.push(...extractIdReferences(obj[i], `${path}[${i}]`));
		}
		return refs;
	}

	const record = obj as Record<string, unknown>;

	// Check for known ID reference patterns
	// Resource IDs in params
	if (typeof record.resourceId === 'string') {
		refs.push({
			type: 'resource',
			id: record.resourceId,
			path: `${path}.resourceId`,
		});
	}

	// Action IDs in params
	if (record.type === 'action' && typeof record.params === 'object') {
		const params = record.params as Record<string, unknown>;
		if (typeof params.id === 'string' && !params.id.startsWith('$')) {
			refs.push({
				type: 'action',
				id: params.id,
				path: `${path}.params.id`,
			});
		}
	}

	// Action IDs in actionId field (cost mods, result mods)
	if (typeof record.actionId === 'string') {
		refs.push({
			type: 'action',
			id: record.actionId,
			path: `${path}.actionId`,
		});
	}

	// Building IDs
	if (record.type === 'building' && typeof record.params === 'object') {
		const params = record.params as Record<string, unknown>;
		if (typeof params.id === 'string') {
			refs.push({
				type: 'building',
				id: params.id,
				path: `${path}.params.id`,
			});
		}
	}

	// Development IDs
	if (record.type === 'development' && typeof record.params === 'object') {
		const params = record.params as Record<string, unknown>;
		if (typeof params.id === 'string') {
			refs.push({
				type: 'development',
				id: params.id,
				path: `${path}.params.id`,
			});
		}
	}

	// Development IDs in .param('id', ...) style
	if (
		typeof record.id === 'string' &&
		path.includes('development') &&
		!path.endsWith('.id')
	) {
		// Skip - this is the effect's own ID
	}

	// Recurse into nested objects
	for (const [key, value] of Object.entries(record)) {
		refs.push(...extractIdReferences(value, `${path}.${key}`));
	}

	return refs;
}

describe('Content Reference Validation', () => {
	const validResourceIds = getValidResourceIds();
	const validActionIds = getValidActionIds();
	const validBuildingIds = getValidBuildingIds();
	const validDevelopmentIds = getValidDevelopmentIds();

	describe('Action definitions', () => {
		it('all resource references point to valid resources', () => {
			const actions = createActionRegistry();
			const errors: string[] = [];

			for (const action of actions.values()) {
				// Check costs
				if (action.costs) {
					for (const resourceId of Object.keys(action.costs)) {
						if (!validResourceIds.has(resourceId)) {
							errors.push(
								`Action "${action.id}" cost references invalid ` +
									`resource "${resourceId}"`,
							);
						}
					}
				}

				// Check effects recursively
				if (action.effects) {
					const refs = extractIdReferences(action.effects, 'effects');
					for (const ref of refs) {
						if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
							errors.push(
								`Action "${action.id}" references invalid resource ` +
									`"${ref.id}" at ${ref.path}`,
							);
						}
					}
				}

				// Check requirements
				if (action.requirements) {
					const refs = extractIdReferences(action.requirements, 'requirements');
					for (const ref of refs) {
						if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
							errors.push(
								`Action "${action.id}" requirement references invalid ` +
									`resource "${ref.id}" at ${ref.path}`,
							);
						}
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all nested action references point to valid actions', () => {
			const actions = createActionRegistry();
			const errors: string[] = [];

			for (const action of actions.values()) {
				if (!action.effects) {
					continue;
				}

				const refs = extractIdReferences(action.effects, 'effects');
				for (const ref of refs) {
					if (ref.type === 'action' && !validActionIds.has(ref.id)) {
						errors.push(
							`Action "${action.id}" references invalid action ` +
								`"${ref.id}" at ${ref.path}`,
						);
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all building references point to valid buildings', () => {
			const actions = createActionRegistry();
			const errors: string[] = [];

			for (const action of actions.values()) {
				if (!action.effects) {
					continue;
				}

				const refs = extractIdReferences(action.effects, 'effects');
				for (const ref of refs) {
					if (ref.type === 'building' && !validBuildingIds.has(ref.id)) {
						errors.push(
							`Action "${action.id}" references invalid building ` +
								`"${ref.id}" at ${ref.path}`,
						);
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all development references point to valid developments', () => {
			const actions = createActionRegistry();
			const errors: string[] = [];

			for (const action of actions.values()) {
				if (!action.effects) {
					continue;
				}

				const refs = extractIdReferences(action.effects, 'effects');
				for (const ref of refs) {
					if (ref.type === 'development' && !validDevelopmentIds.has(ref.id)) {
						errors.push(
							`Action "${action.id}" references invalid development ` +
								`"${ref.id}" at ${ref.path}`,
						);
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});
	});

	describe('Building definitions', () => {
		it('all resource references point to valid resources', () => {
			const buildings = createBuildingRegistry();
			const errors: string[] = [];

			for (const building of buildings.values()) {
				// Check costs
				if (building.costs) {
					for (const resourceId of Object.keys(building.costs)) {
						if (!validResourceIds.has(resourceId)) {
							errors.push(
								`Building "${building.id}" cost references invalid ` +
									`resource "${resourceId}"`,
							);
						}
					}
				}

				// Check onBuild effects
				if (building.onBuild) {
					const refs = extractIdReferences(building.onBuild, 'onBuild');
					for (const ref of refs) {
						if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
							errors.push(
								`Building "${building.id}" references invalid resource ` +
									`"${ref.id}" at ${ref.path}`,
							);
						}
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all action references point to valid actions', () => {
			const buildings = createBuildingRegistry();
			const errors: string[] = [];

			for (const building of buildings.values()) {
				if (!building.onBuild) {
					continue;
				}

				const refs = extractIdReferences(building.onBuild, 'onBuild');
				for (const ref of refs) {
					if (ref.type === 'action' && !validActionIds.has(ref.id)) {
						errors.push(
							`Building "${building.id}" references invalid action ` +
								`"${ref.id}" at ${ref.path}`,
						);
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});
	});

	describe('Development definitions', () => {
		it('all resource references point to valid resources', () => {
			const developments = createDevelopmentRegistry();
			const errors: string[] = [];

			for (const dev of developments.values()) {
				// Check onBuild effects
				if (dev.onBuild) {
					const refs = extractIdReferences(dev.onBuild, 'onBuild');
					for (const ref of refs) {
						if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
							errors.push(
								`Development "${dev.id}" references invalid resource ` +
									`"${ref.id}" at ${ref.path}`,
							);
						}
					}
				}

				// Check onGainIncomeStep effects
				if (dev.onGainIncomeStep) {
					const refs = extractIdReferences(
						dev.onGainIncomeStep,
						'onGainIncomeStep',
					);
					for (const ref of refs) {
						if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
							errors.push(
								`Development "${dev.id}" references invalid resource ` +
									`"${ref.id}" at ${ref.path}`,
							);
						}
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});
	});

	describe('Resource definitions', () => {
		it('all upkeep resource references point to valid resources', () => {
			const catalog = buildResourceCatalog();
			const errors: string[] = [];

			for (const resource of catalog.resources.ordered) {
				if (resource.upkeep) {
					const upkeepResourceId = resource.upkeep.resourceId;
					if (!validResourceIds.has(upkeepResourceId)) {
						errors.push(
							`Resource "${resource.id}" upkeep references invalid ` +
								`resource "${upkeepResourceId}"`,
						);
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all bound references point to valid resources', () => {
			const catalog = buildResourceCatalog();
			const errors: string[] = [];

			for (const resource of catalog.resources.ordered) {
				if (
					resource.upperBound &&
					typeof resource.upperBound === 'object' &&
					'boundTo' in resource.upperBound
				) {
					const boundToId = String(resource.upperBound.boundTo);
					if (!validResourceIds.has(boundToId)) {
						errors.push(
							`Resource "${resource.id}" upperBound references invalid ` +
								`resource "${boundToId}"`,
						);
					}
				}
			}

			// Check group parent bounds
			for (const group of catalog.groups.ordered) {
				if (group.parent) {
					if (
						group.parent.upperBound &&
						typeof group.parent.upperBound === 'object' &&
						'boundTo' in group.parent.upperBound
					) {
						const boundToId = String(group.parent.upperBound.boundTo);
						if (!validResourceIds.has(boundToId)) {
							errors.push(
								`Group "${group.id}" parent upperBound references invalid ` +
									`resource "${boundToId}"`,
							);
						}
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});

		it('all trigger effects reference valid resources', () => {
			const catalog = buildResourceCatalog();
			const errors: string[] = [];

			for (const resource of catalog.resources.ordered) {
				// Check all trigger effects
				const triggerKeys = [
					'onGainIncomeStep',
					'onGainAPStep',
					'onPayUpkeepStep',
					'onValueIncrease',
					'onValueDecrease',
				] as const;

				for (const key of triggerKeys) {
					const effect = resource[key];
					if (effect) {
						const refs = extractIdReferences(effect, key);
						for (const ref of refs) {
							if (ref.type === 'resource' && !validResourceIds.has(ref.id)) {
								errors.push(
									`Resource "${resource.id}" ${key} references invalid ` +
										`resource "${ref.id}" at ${ref.path}`,
								);
							}
						}
					}
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});
	});

	describe('Resource constant completeness', () => {
		it('all Resource constants map to defined resources', () => {
			const errors: string[] = [];

			for (const [key, id] of Object.entries(CResource)) {
				if (!validResourceIds.has(id)) {
					errors.push(
						`Resource constant "${key}" (${id}) has no matching ` +
							`resource definition`,
					);
				}
			}

			expect(errors, errors.join('\n')).toHaveLength(0);
		});
	});
});
