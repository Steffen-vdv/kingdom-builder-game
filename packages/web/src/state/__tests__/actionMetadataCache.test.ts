import { describe, expect, it } from 'vitest';
import { ActionMetadataCache } from '../actionMetadataCache';
import type { SessionActionRequirementList } from '@kingdom-builder/protocol/session';

describe('ActionMetadataCache', () => {
	it('keeps inactive player requirements after active player updates', () => {
		const cache = new ActionMetadataCache();
		const actionId = 'vitest:action';
		const inactiveRequirements: SessionActionRequirementList = [
			{
				requirement: { type: 'test', method: 'fail' },
				message: 'Inactive requires farmland',
			},
		];
		cache.cacheActionRequirements(
			actionId,
			inactiveRequirements,
			undefined,
			'B',
		);
		cache.cacheActionRequirements(actionId, [], undefined, 'A');
		cache.cacheActionRequirements(
			actionId,
			[
				{
					requirement: { type: 'test', method: 'fail' },
					message: 'Active gained resource',
				},
			],
			undefined,
			'A',
		);
		const opponentSnapshot = cache.readActionMetadata(actionId, undefined, 'B');
		expect(opponentSnapshot.requirements).toEqual(inactiveRequirements);
	});
});
