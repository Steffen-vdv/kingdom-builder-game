import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import {
	validateAuth,
	getDevTokenEnvKey,
	getDevTokenHeaderName,
} from '../../src/auth/index.js';

const ENV_KEY = getDevTokenEnvKey();
const ORIGINAL_VALUE = process.env[ENV_KEY];

beforeEach(() => {
	process.env[ENV_KEY] = JSON.stringify({
		'bearer-token': {
			userId: 'bearer-user',
			roles: ['session:create'],
		},
		'header-token': {
			userId: 'header-user',
			roles: ['session:advance'],
		},
	});
});

afterAll(() => {
	if (ORIGINAL_VALUE === undefined) {
		delete process.env[ENV_KEY];
		return;
	}
	process.env[ENV_KEY] = ORIGINAL_VALUE;
});

function createHeaders(
	headers: Record<string, string>,
): Record<string, string> {
	const normalized: Record<string, string> = {};
	for (const [key, value] of Object.entries(headers)) {
		normalized[key.toLowerCase()] = value;
	}
	return normalized;
}

describe('validateAuth', () => {
	it('resolves bearer tokens', () => {
		const headers = createHeaders({ Authorization: 'Bearer bearer-token' });
		const auth = validateAuth(headers);
		expect(auth?.userId).toBe('bearer-user');
		expect(auth?.roles).toContain('session:create');
	});

	it('resolves development header tokens', () => {
		const headers = createHeaders({
			[getDevTokenHeaderName()]: 'header-token',
		});
		const auth = validateAuth(headers);
		expect(auth?.userId).toBe('header-user');
		expect(auth?.roles).toContain('session:advance');
	});

	it('returns undefined for unknown tokens', () => {
		const headers = createHeaders({ Authorization: 'Bearer unknown-token' });
		const auth = validateAuth(headers);
		expect(auth).toBeUndefined();
	});
});
