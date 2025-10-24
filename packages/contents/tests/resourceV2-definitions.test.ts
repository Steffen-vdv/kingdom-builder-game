import { describe, expect, it } from 'vitest';

import { RESOURCE_V2_DEFINITION_SCAFFOLD, RESOURCE_V2_GROUP_SCAFFOLD, createResourceV2DefinitionScaffold, createResourceV2GroupScaffold, sortByOrder } from '../src/resourceV2';

describe('resourceV2 definition scaffolds', () => {
	it('expose frozen empty registries for definitions and groups', () => {
		const definitionScaffold = createResourceV2DefinitionScaffold();
		const groupScaffold = createResourceV2GroupScaffold();

		expect(definitionScaffold).toEqual({});
		expect(groupScaffold).toEqual({});
		expect(definitionScaffold).toEqual(RESOURCE_V2_DEFINITION_SCAFFOLD);
		expect(groupScaffold).toEqual(RESOURCE_V2_GROUP_SCAFFOLD);
		expect(Object.isFrozen(definitionScaffold)).toBe(true);
		expect(Object.isFrozen(groupScaffold)).toBe(true);
	});

	it('keeps ordering helpers stable even without seed entries', () => {
		const unordered = [{ id: 'beta', order: 4 }, { id: 'alpha', order: 0 }, { id: 'omega' }];

		const ordered = sortByOrder(unordered);

		expect(ordered.map((entry) => entry.id)).toEqual(['alpha', 'beta', 'omega']);
	});
});
