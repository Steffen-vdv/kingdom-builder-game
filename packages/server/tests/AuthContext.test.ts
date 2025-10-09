import { describe, it, expect } from 'vitest';
import * as authContext from '../src/auth/AuthContext.js';

describe('AuthContext module', () => {
	it('exports runtime metadata without throwing', () => {
		expect(authContext).toBeDefined();
		expect(Object.keys(authContext)).toEqual([]);
	});
});
