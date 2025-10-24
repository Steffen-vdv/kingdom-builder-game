import { describe, it, expect, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import {
	sanitizePlayerName,
	sanitizePlayerNameEntries,
	applyPlayerNames,
	PLAYER_NAME_MAX_LENGTH,
} from '../../src/transport/playerNameHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';

describe('playerNameHelpers', () => {
	describe('sanitizePlayerName', () => {
		it('trims whitespace while preserving valid names', () => {
			expect(sanitizePlayerName('  Voyager  ')).toBe('Voyager');
		});

		it('returns undefined for names that trim to empty strings', () => {
			expect(sanitizePlayerName('   ')).toBeUndefined();
		});

		it('throws when names exceed the maximum length', () => {
			const tooLong = 'X'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
			expect(() => sanitizePlayerName(tooLong)).toThrow(TransportError);
		});
	});

	describe('sanitizePlayerNameEntries', () => {
		it('skips undefined and empty entries', () => {
			const entries = sanitizePlayerNameEntries({
				A: '  Voyager  ',
				B: undefined,
				C: '   ',
				D: 'Nomad',
			});
			expect(entries).toEqual([
				['A', 'Voyager'],
				['D', 'Nomad'],
			]);
		});
	});

	describe('applyPlayerNames', () => {
		it('applies sanitized player names to the session', () => {
			const updatePlayerName = vi.fn();
			const session = { updatePlayerName } as unknown as EngineSession;
			applyPlayerNames(session, {
				A: '  Voyager  ',
				B: undefined,
				C: '   ',
			});
			expect(updatePlayerName).toHaveBeenCalledTimes(1);
			expect(updatePlayerName).toHaveBeenCalledWith('A', 'Voyager');
		});

		it('propagates sanitization errors without mutating the session', () => {
			const updatePlayerName = vi.fn();
			const session = { updatePlayerName } as unknown as EngineSession;
			const overLengthName = 'Z'.repeat(PLAYER_NAME_MAX_LENGTH + 5);
			expect(() => applyPlayerNames(session, { A: overLengthName })).toThrow(
				TransportError,
			);
			expect(updatePlayerName).not.toHaveBeenCalled();
		});
	});
});
