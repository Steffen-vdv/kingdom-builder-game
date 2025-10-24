import { describe, expect, it } from 'vitest';

import {
	RESOURCE_V2_DEFINITION_ARTIFACTS,
	RESOURCE_V2_DEFINITION_REGISTRY,
	RESOURCE_V2_GROUP_ARTIFACTS,
	RESOURCE_V2_GROUP_REGISTRY,
	createResourceGroupRegistry,
	createResourceV2Registry,
	deriveResourceV2PrimaryIconCandidate,
	resourceV2Definition,
	resourceV2Group,
	resourceV2GroupParent,
} from '../src/resourceV2';

describe('ResourceV2 registries', () => {
	it('builds definition lookups and ordering helpers', () => {
		const wood = resourceV2Definition('wood').name('Wood').order(2).icon('🪵').group('economy', 1).build();
		const mana = resourceV2Definition('mana').name('Mana').order(3).build();
		const ore = resourceV2Definition('ore').name('Ore').order(5).icon('🪨').group('economy', 2).build();

		const artifacts = createResourceV2Registry([wood, mana, ore]);

		expect(artifacts.registry.get('wood')).toEqual(wood);
		expect(artifacts.definitionsById.wood).toEqual(wood);
		expect(artifacts.orderedIds).toEqual(['wood', 'mana', 'ore']);

		const economyMembers = artifacts.definitionsByGroup.get('economy');

		expect(economyMembers?.map((definition) => definition.id)).toEqual(['wood', 'ore']);

		expect(artifacts.primaryIconCandidate).toEqual({
			source: 'definition',
			resourceId: 'wood',
			icon: '🪵',
		});
	});

	it('builds group lookups and ordering helpers', () => {
		const mysticGroup = resourceV2Group('mystic').order(1).parent(resourceV2GroupParent('mystic-root').name('Mystic Root').order(2)).child('mana').build();
		const economyGroup = resourceV2Group('economy').order(3).parent(resourceV2GroupParent('economy-root').name('Economy Root').order(5).icon('💰')).children(['wood', 'ore']).build();

		const artifacts = createResourceGroupRegistry([economyGroup, mysticGroup]);

		expect(artifacts.registry.get('economy')).toEqual(economyGroup);
		expect(artifacts.groupsById.economy).toEqual(economyGroup);
		expect(artifacts.orderedIds).toEqual(['mystic', 'economy']);
		expect(artifacts.orderedParents.map((parent) => parent.id)).toEqual(['mystic-root', 'economy-root']);
		expect(artifacts.parentDescriptorsById['economy-root']).toEqual(economyGroup.parent);
		expect(artifacts.primaryIconCandidate).toEqual({
			source: 'group-parent',
			parentId: 'economy-root',
			icon: '💰',
		});
	});

	it('derives a primary icon candidate preferring definitions over groups', () => {
		const definitionsWithIcon = [resourceV2Definition('mana').name('Mana').order(1).icon('✨').build()];
		const groupArtifacts = createResourceGroupRegistry([
			resourceV2Group('economy').order(2).parent(resourceV2GroupParent('economy-root').name('Economy Root').order(5).icon('💰')).child('mana').build(),
		]);

		const preferredCandidate = deriveResourceV2PrimaryIconCandidate(createResourceV2Registry(definitionsWithIcon), groupArtifacts);

		expect(preferredCandidate).toEqual({
			source: 'definition',
			resourceId: 'mana',
			icon: '✨',
		});

		const fallbackCandidate = deriveResourceV2PrimaryIconCandidate(createResourceV2Registry([resourceV2Definition('ore').name('Ore').order(4).build()]), groupArtifacts);

		expect(fallbackCandidate).toEqual({
			source: 'group-parent',
			parentId: 'economy-root',
			icon: '💰',
		});
	});

	it('provides default registry artifacts for startup metadata', () => {
		const defaultDefinitionIds = RESOURCE_V2_DEFINITION_ARTIFACTS.definitions.map((definition) => definition.id);
		expect(defaultDefinitionIds).toContain('absorption');
		expect(RESOURCE_V2_DEFINITION_REGISTRY.values().map((definition) => definition.id)).toEqual(defaultDefinitionIds);
		expect(RESOURCE_V2_GROUP_ARTIFACTS.groups).toEqual([]);
		expect(RESOURCE_V2_GROUP_REGISTRY.values()).toEqual([]);
	});
});
