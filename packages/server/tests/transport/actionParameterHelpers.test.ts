import { describe, it, expect } from 'vitest';
import { parseActionParameters } from '../../src/transport/actionParameterHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';

describe('parseActionParameters', () => {
	it('returns undefined when parameters are not provided', () => {
		const parsed = parseActionParameters(undefined, 'missing params');
		expect(parsed).toBeUndefined();
	});

	it('validates and normalizes action parameters using the protocol schema', () => {
		const params = {
			choices: {
				'scout-option': {
					optionId: 'deploy',
					params: { quantity: 2 },
				},
			},
			extra: { allow: true },
		};

		const parsed = parseActionParameters(params, 'invalid params');

		expect(parsed).toEqual({
			choices: {
				'scout-option': {
					optionId: 'deploy',
					params: { quantity: 2 },
				},
			},
			extra: { allow: true },
		});
	});

	it('throws a transport error with schema issues when validation fails', () => {
		let thrown: unknown;
		try {
			parseActionParameters('not-an-object', 'expected object');
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
			expect(thrown.message).toBe('expected object');
			expect(Array.isArray(thrown.issues)).toBe(true);
			expect(thrown.issues).not.toHaveLength(0);
		}
	});
});
