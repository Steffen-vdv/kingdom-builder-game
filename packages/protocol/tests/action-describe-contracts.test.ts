import { describe, expect, it } from 'vitest';
import {
	actionDescribeRequestSchema,
	actionDescribeResponseSchema,
} from '@kingdom-builder/protocol';

describe('action describe contracts', () => {
	it('accepts a valid describe request payload', () => {
		const request = {
			sessionId: 'session-123',
			actionId: 'build-farm',
			params: {
				choices: {
					'build-slot': {
						optionId: 'slot-1',
					},
				},
			},
		};
		const parsed = actionDescribeRequestSchema.safeParse(request);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data).toEqual(request);
		}
	});

	it('rejects describe requests without a session id', () => {
		const parsed = actionDescribeRequestSchema.safeParse({
			actionId: 'build-farm',
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects describe requests with an empty action id', () => {
		const parsed = actionDescribeRequestSchema.safeParse({
			sessionId: 'session-123',
			actionId: '',
		});
		expect(parsed.success).toBe(false);
	});

	it('accepts a valid describe response payload', () => {
		const response = {
			sessionId: 'session-123',
			actionId: 'build-farm',
			definition: {
				id: 'build-farm',
				name: 'Build Farm',
			},
			options: [
				{
					id: 'build-slot',
					title: 'Select Slot',
					options: [
						{
							id: 'slot-1',
							actionId: 'build-farm',
						},
					],
				},
			],
			costs: {
				gold: 4,
			},
			requirements: [
				{
					requirement: {
						type: 'resource',
						method: 'minimum',
						params: {
							key: 'gold',
							amount: 2,
						},
					},
					details: {
						current: 1,
					},
					message: 'Requires more gold.',
				},
			],
		};
		const parsed = actionDescribeResponseSchema.safeParse(response);
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data).toEqual(response);
		}
	});

	it('rejects describe responses with non-numeric costs', () => {
		const parsed = actionDescribeResponseSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'build-farm',
			options: [
				{
					id: 'build-slot',
					title: 'Select Slot',
					options: [
						{
							id: 'slot-1',
							actionId: 'build-farm',
						},
					],
				},
			],
			costs: {
				gold: '4',
			},
			requirements: [],
		});
		expect(parsed.success).toBe(false);
	});

	it('rejects describe responses with malformed requirements', () => {
		const parsed = actionDescribeResponseSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'build-farm',
			options: [
				{
					id: 'build-slot',
					title: 'Select Slot',
					options: [
						{
							id: 'slot-1',
							actionId: 'build-farm',
						},
					],
				},
			],
			costs: {},
			requirements: [
				{
					requirement: {
						type: 'resource',
					},
				},
			],
		});
		expect(parsed.success).toBe(false);
	});
});
