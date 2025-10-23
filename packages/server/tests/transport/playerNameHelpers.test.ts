import { describe, it, expect, vi } from 'vitest';
import { TransportError } from '../../src/transport/TransportTypes.js';
import {
	PLAYER_NAME_MAX_LENGTH,
	applyPlayerNames,
	sanitizePlayerName,
	sanitizePlayerNameEntries,
} from '../../src/transport/playerNameHelpers.js';
import { createSyntheticSessionManager } from '../helpers/createSyntheticSessionManager.js';

describe('sanitizePlayerName', () => {
	it('trims surrounding whitespace', () => {
		expect(sanitizePlayerName('  Pathfinder  ')).toBe('Pathfinder');
	});

	it('returns undefined when the trimmed name is empty', () => {
		expect(sanitizePlayerName('     ')).toBeUndefined();
	});

	it('throws a transport error when the name exceeds the maximum length', () => {
		const overLengthName = 'X'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		let thrown: unknown;

		try {
			sanitizePlayerName(overLengthName);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(TransportError);
		if (thrown instanceof TransportError) {
			expect(thrown.code).toBe('INVALID_REQUEST');
			expect(thrown.message).toContain(
				`Player names must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer.`,
			);
		}
	});
});

describe('sanitizePlayerNameEntries', () => {
	it('returns sanitized entries and ignores undefined or empty values', () => {
		const entries = sanitizePlayerNameEntries({
			A: '  Aegis  ',
			B: undefined,
			C: '   ',
		});

		expect(entries).toEqual([['A', 'Aegis']]);
	});
});

describe('applyPlayerNames', () => {
	it('applies sanitized names to the engine session', () => {
		const { manager } = createSyntheticSessionManager();
		const session = manager.createSession('naming-session');
		const updateSpy = vi.spyOn(session, 'updatePlayerName');

		applyPlayerNames(session, {
			A: '  Vanguard  ',
			B: undefined,
			C: '   ',
		});

		expect(updateSpy).toHaveBeenCalledTimes(1);
		expect(updateSpy).toHaveBeenCalledWith('A', 'Vanguard');
	});
});
