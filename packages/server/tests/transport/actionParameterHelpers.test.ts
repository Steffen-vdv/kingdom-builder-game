import { describe, it, expect } from 'vitest';
import { parseActionParameters } from '../../src/transport/actionParameterHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';

describe('parseActionParameters', () => {
	it('returns undefined when params are not provided', () => {
		expect(parseActionParameters(undefined, 'no params')).toBeUndefined();
	});

	it('returns normalized action parameters when parsing succeeds', () => {
		const params = {
			choices: {
				explore: {
					optionId: 'forest',
					params: {
						flavor: 'scout',
					},
				},
			},
			custom: 42,
		} as const;

		const parsed = parseActionParameters(params, 'valid params');

		expect(parsed).toEqual({
			choices: {
				explore: {
					optionId: 'forest',
					params: {
						flavor: 'scout',
					},
				},
			},
			custom: 42,
		});
	});

	it('throws a transport error that exposes zod issues on failure', () => {
		let thrown: unknown;

		try {
			parseActionParameters({ choices: 'invalid-choice-map' }, 'parse failure');
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
			expect(thrown.message).toBe('parse failure');
			expect(thrown.issues).toBeDefined();
		}
	});
});
