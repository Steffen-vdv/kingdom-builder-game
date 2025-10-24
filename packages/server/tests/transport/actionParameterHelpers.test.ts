import { describe, it, expect } from 'vitest';
import { parseActionParameters } from '../../src/transport/actionParameterHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';

describe('parseActionParameters', () => {
	it('returns undefined when the payload omits params', () => {
		const normalized = parseActionParameters(undefined, 'missing params');
		expect(normalized).toBeUndefined();
	});

	it('normalizes protocol compliant payloads', () => {
		const parameters = {
			choices: {
				primary: {
					optionId: 'synthetic:choice',
					params: { amount: 3 },
				},
			},
			extra: { note: 'forwarded' },
		};
		const normalized = parseActionParameters(
			parameters,
			'valid params required',
		);
		expect(normalized).toEqual(parameters);
	});

	it('throws transport errors for invalid payloads', () => {
		const invalid = {
			choices: {
				primary: {
					// optionId must be a string according to the protocol schema
					optionId: 42,
				},
			},
		};
		expect(() => parseActionParameters(invalid, 'invalid params')).toThrowError(
			TransportError,
		);
		try {
			parseActionParameters(invalid, 'invalid params');
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
				expect(error.message).toBe('invalid params');
			}
		}
	});
});
