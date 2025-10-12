import { describe, expect, it } from 'vitest';
import {
	actionDescribeRequestSchema,
	actionDescribeResponseSchema,
} from '@kingdom-builder/protocol';

const validRequirement = {
	requirement: {
		type: 'resource',
		method: 'atLeast',
		params: {
			resource: 'gold',
			amount: 3,
		},
	},
	details: {
		missing: 2,
	},
	message: 'Need more gold',
};

describe('actionDescribeRequestSchema', () => {
	it('accepts a valid describe request', () => {
		const result = actionDescribeRequestSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'action-build',
		});

		expect(result.success).toBe(true);
	});

	it('rejects a request without a session id', () => {
		const result = actionDescribeRequestSchema.safeParse({
			actionId: 'action-build',
		});

		expect(result.success).toBe(false);
	});

	it('rejects a request with an invalid action id', () => {
		const result = actionDescribeRequestSchema.safeParse({
			sessionId: 'session-123',
			actionId: '',
		});

		expect(result.success).toBe(false);
	});
});

describe('actionDescribeResponseSchema', () => {
	it('accepts a valid describe response', () => {
		const result = actionDescribeResponseSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'action-build',
			definition: {
				id: 'action-build',
				name: 'Build',
			},
			costs: {
				gold: 5,
				stone: 2,
			},
			requirements: [validRequirement],
		});

		expect(result.success).toBe(true);
	});

	it('rejects a response with malformed costs', () => {
		const result = actionDescribeResponseSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'action-build',
			definition: {
				id: 'action-build',
				name: 'Build',
			},
			costs: {
				gold: 'five',
			},
			requirements: [validRequirement],
		});

		expect(result.success).toBe(false);
	});

	it('rejects a response with malformed requirements', () => {
		const result = actionDescribeResponseSchema.safeParse({
			sessionId: 'session-123',
			actionId: 'action-build',
			definition: {
				id: 'action-build',
				name: 'Build',
			},
			costs: {
				gold: 5,
			},
			requirements: [
				{
					type: 'resource',
					method: 'atLeast',
				},
			],
		});

		expect(result.success).toBe(false);
	});
});
