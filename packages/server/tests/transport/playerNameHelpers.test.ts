import { describe, it, expect, vi } from 'vitest';
import {
	sanitizePlayerName,
	sanitizePlayerNameEntries,
	applyPlayerNames,
	PLAYER_NAME_MAX_LENGTH,
} from '../../src/transport/playerNameHelpers.js';
import { TransportError } from '../../src/transport/TransportTypes.js';
import type { SessionPlayerNameMap } from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';

describe('player name helpers', () => {
	describe('sanitizePlayerName', () => {
		it('trims and returns valid names', () => {
			expect(sanitizePlayerName('  Voyager  ')).toBe('Voyager');
		});

		it('returns undefined for names that trim to empty', () => {
			expect(sanitizePlayerName('   ')).toBeUndefined();
		});

		it('throws when names exceed the allowed length', () => {
			const tooLong = 'N'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
			expect(() => sanitizePlayerName(tooLong)).toThrow(TransportError);
		});
	});

	describe('sanitizePlayerNameEntries', () => {
		it('filters undefined or empty entries and preserves ids', () => {
			const names: SessionPlayerNameMap = {
				A: '  Explorer  ',
				B: undefined,
				C: '   ',
			};
			const entries = sanitizePlayerNameEntries(names);
			expect(entries).toEqual([['A', 'Explorer']]);
		});
	});

	describe('applyPlayerNames', () => {
		it('applies sanitized names to the session', () => {
			const updatePlayerName = vi.fn();
			const session = {
				updatePlayerName,
			} as unknown as EngineSession;
			const names: SessionPlayerNameMap = {
				A: '  Pathfinder  ',
				B: undefined,
			};
			applyPlayerNames(session, names);
			expect(updatePlayerName).toHaveBeenCalledTimes(1);
			expect(updatePlayerName).toHaveBeenCalledWith('A', 'Pathfinder');
		});

		it('rethrows validation errors from the sanitizer', () => {
			const session = {
				updatePlayerName: vi.fn(),
			} as unknown as EngineSession;
			const names: SessionPlayerNameMap = {
				A: 'N'.repeat(PLAYER_NAME_MAX_LENGTH + 1),
			};
			expect(() => applyPlayerNames(session, names)).toThrow(TransportError);
		});
	});
});
