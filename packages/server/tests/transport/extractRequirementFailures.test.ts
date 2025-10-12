import { describe, it, expect } from 'vitest';
import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';
import { extractRequirementFailures } from '../../src/transport/extractRequirementFailures.js';

describe('extractRequirementFailures', () => {
	it('extracts a single requirement failure and returns clones', () => {
		const requirementFailure = {
			requirement: {
				type: 'resource',
				method: 'minimum',
				params: { key: 'gold', amount: 3 },
			},
			details: { needed: 3 },
			message: 'Need more gold',
		} satisfies SessionRequirementFailure;
		const error = { requirementFailure };

		const extracted = extractRequirementFailures(error);

		expect(extracted.requirementFailure).toEqual(requirementFailure);
		expect(extracted.requirementFailures).toHaveLength(1);
		expect(extracted.requirementFailures?.[0]).toEqual(requirementFailure);
		expect(extracted.requirementFailure).not.toBe(requirementFailure);
		expect(extracted.requirementFailures?.[0]).not.toBe(requirementFailure);

		requirementFailure.requirement.params = { key: 'gold', amount: 6 };
		requirementFailure.details = { needed: 6 };
		requirementFailure.message = 'changed';

		expect(extracted.requirementFailure).toEqual({
			requirement: {
				type: 'resource',
				method: 'minimum',
				params: { key: 'gold', amount: 3 },
			},
			details: { needed: 3 },
			message: 'Need more gold',
		});
		expect(extracted.requirementFailures?.[0]).toEqual({
			requirement: {
				type: 'resource',
				method: 'minimum',
				params: { key: 'gold', amount: 3 },
			},
			details: { needed: 3 },
			message: 'Need more gold',
		});
	});

	it('extracts a requirement failure list and returns clones', () => {
		const requirementFailures = [
			{
				requirement: {
					type: 'resource',
					method: 'maximum',
					params: { key: 'wood', amount: 5 },
				},
				details: { available: 1 },
				message: 'Too much wood',
			},
			{
				requirement: {
					type: 'population',
					method: 'minimum',
					params: { role: 'citizen', amount: 2 },
				},
				details: { available: 1 },
				message: 'Need more citizens',
			},
		] satisfies SessionActionRequirementList;
		const error = { requirementFailures };

		const extracted = extractRequirementFailures(error);

		expect(extracted.requirementFailures).toEqual(requirementFailures);
		expect(extracted.requirementFailure).toEqual(requirementFailures[0]);
		expect(extracted.requirementFailures).not.toBe(requirementFailures);
		expect(extracted.requirementFailure).not.toBe(requirementFailures[0]);
		expect(extracted.requirementFailures?.[1]).not.toBe(requirementFailures[1]);

		requirementFailures[0].message = 'updated';
		requirementFailures[0].requirement.params = {
			key: 'wood',
			amount: 10,
		};
		requirementFailures.push({
			requirement: {
				type: 'resource',
				method: 'minimum',
				params: { key: 'stone', amount: 1 },
			},
			details: { available: 0 },
			message: 'Need stone',
		});

		expect(extracted.requirementFailures).toHaveLength(2);
		expect(extracted.requirementFailures?.[0]).toEqual({
			requirement: {
				type: 'resource',
				method: 'maximum',
				params: { key: 'wood', amount: 5 },
			},
			details: { available: 1 },
			message: 'Too much wood',
		});
	});

	it('prefers a standalone failure when both fields are present', () => {
		const singleFailure = {
			requirement: {
				type: 'resource',
				method: 'minimum',
				params: { key: 'gold', amount: 2 },
			},
			message: 'single failure',
		} satisfies SessionRequirementFailure;
		const listFailures = [
			{
				requirement: {
					type: 'resource',
					method: 'minimum',
					params: { key: 'gold', amount: 10 },
				},
				message: 'list failure',
			},
		] satisfies SessionActionRequirementList;
		const error = {
			requirementFailure: singleFailure,
			requirementFailures: listFailures,
		};

		const extracted = extractRequirementFailures(error);

		expect(extracted.requirementFailure).toEqual(singleFailure);
		expect(extracted.requirementFailure?.message).toBe('single failure');
		expect(extracted.requirementFailures).toEqual(listFailures);
		expect(extracted.requirementFailure).not.toBe(singleFailure);
		expect(extracted.requirementFailures).not.toBe(listFailures);
	});

	it('returns an empty result for non-object errors', () => {
		expect(extractRequirementFailures(undefined)).toEqual({});
		expect(extractRequirementFailures(null)).toEqual({});
		expect(extractRequirementFailures('error')).toEqual({});
		expect(extractRequirementFailures(42)).toEqual({});
	});
});
