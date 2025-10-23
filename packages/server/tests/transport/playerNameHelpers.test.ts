import { describe, expect, it, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import {
	PLAYER_NAME_MAX_LENGTH,
	applyPlayerNames,
	sanitizePlayerName,
	sanitizePlayerNameEntries,
} from '../../src/transport/playerNameHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';

describe('player name helpers', () => {
	describe('sanitizePlayerName', () => {
		it('trims surrounding whitespace from names', () => {
			expect(sanitizePlayerName('\t Voyager  ')).toBe('Voyager');
		});

		it('returns undefined for empty or whitespace-only input', () => {
			expect(sanitizePlayerName('')).toBeUndefined();
			expect(sanitizePlayerName('   ')).toBeUndefined();
		});

		it('rejects names longer than the allowed maximum', () => {
			const tooLong = 'Q'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
			expect(() => sanitizePlayerName(tooLong)).toThrow(TransportError);
		});
	});

	describe('sanitizePlayerNameEntries', () => {
		it('returns sanitized entries for defined player names', () => {
			const entries = sanitizePlayerNameEntries({
				A: '  Captain  ',
				B: undefined,
				C: '  ',
				D: 'Scout',
			});
			expect(entries).toEqual([
				['A', 'Captain'],
				['D', 'Scout'],
			]);
		});
	});

	describe('applyPlayerNames', () => {
		it('applies sanitized entries to the engine session', () => {
			const updatePlayerName = vi.fn();
			const session = {
				updatePlayerName,
			} as unknown as EngineSession;

			applyPlayerNames(session, {
				A: '  Voyager  ',
				B: undefined,
				C: '   ',
				D: 'Ranger',
			});

			expect(updatePlayerName).toHaveBeenCalledTimes(2);
			expect(updatePlayerName).toHaveBeenNthCalledWith(1, 'A', 'Voyager');
			expect(updatePlayerName).toHaveBeenNthCalledWith(2, 'D', 'Ranger');
		});
	});
});
