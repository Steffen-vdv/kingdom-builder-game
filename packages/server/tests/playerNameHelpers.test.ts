import { describe, it, expect, vi } from 'vitest';
import {
	PLAYER_NAME_MAX_LENGTH,
	sanitizePlayerName,
	sanitizePlayerNameEntries,
	applyPlayerNames,
} from '../src/transport/playerNameHelpers.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import type { EngineSession } from '@kingdom-builder/engine';

function createSessionSpy() {
	const updatePlayerName = vi.fn();
	const session = {
		updatePlayerName,
	} as unknown as EngineSession;
	return { session, updatePlayerName };
}

describe('playerNameHelpers', () => {
	it('sanitizes player names by trimming whitespace', () => {
		const sanitized = sanitizePlayerName('  Voyager  ');
		expect(sanitized).toBe('Voyager');
	});

	it('returns undefined when player names trim to empty strings', () => {
		expect(sanitizePlayerName('   ')).toBeUndefined();
	});

	it('rejects player names that exceed the maximum length', () => {
		const overlong = 'Q'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		expect(() => sanitizePlayerName(overlong)).toThrow(TransportError);
	});

	it('filters undefined or empty entries when sanitizing name maps', () => {
		const entries = sanitizePlayerNameEntries({
			A: '  Aria  ',
			B: undefined,
			C: '   ',
		});
		expect(entries).toEqual([['A', 'Aria']]);
	});

	it('applies sanitized player names to the provided session', () => {
		const { session, updatePlayerName } = createSessionSpy();
		applyPlayerNames(session, {
			A: '  Ranger  ',
			B: 'Mystic',
			C: '   ',
		});
		expect(updatePlayerName).toHaveBeenCalledWith('A', 'Ranger');
		expect(updatePlayerName).toHaveBeenCalledWith('B', 'Mystic');
		expect(updatePlayerName).not.toHaveBeenCalledWith('C', expect.anything());
	});
});
