import { describe, expect, it, vi } from 'vitest';
import {
	PLAYER_NAME_MAX_LENGTH,
	applyPlayerNames,
	sanitizePlayerName,
	sanitizePlayerNameEntries,
} from '../src/transport/playerNameHelpers.js';
import { TransportError } from '../src/transport/TransportTypes.js';

describe('playerNameHelpers', () => {
	it('sanitizes player names and rejects empty inputs', () => {
		expect(sanitizePlayerName('  Ada Lovelace  ')).toBe('Ada Lovelace');
		expect(sanitizePlayerName('\tAda\n')).toBe('Ada');
		expect(sanitizePlayerName('   ')).toBeUndefined();
	});

	it('enforces the maximum name length when trimming input', () => {
		const longName = 'x'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		expect(() => sanitizePlayerName(longName)).toThrow(TransportError);
	});

	it('collects sanitized entries while skipping undefined names', () => {
		const entries = sanitizePlayerNameEntries({
			playerA: '  Alpha  ',
			playerB: undefined,
			playerC: '   ',
			playerD: 'Delta',
		});
		expect(entries).toEqual([
			['playerA', 'Alpha'],
			['playerD', 'Delta'],
		]);
	});

	it('applies sanitized names to the engine session', () => {
		const updatePlayerName = vi.fn();
		const session = { updatePlayerName } as {
			updatePlayerName: ReturnType<typeof vi.fn>;
		};
		applyPlayerNames(session, {
			alpha: '  Commander  ',
			beta: undefined,
			gamma: '  ',
		});
		expect(updatePlayerName).toHaveBeenCalledTimes(1);
		expect(updatePlayerName).toHaveBeenCalledWith('alpha', 'Commander');
	});
});
