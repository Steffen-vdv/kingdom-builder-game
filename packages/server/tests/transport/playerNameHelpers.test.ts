import { describe, expect, it, vi } from 'vitest';
import type { EngineSession } from '@kingdom-builder/engine';
import { TransportError } from '../../src/transport/TransportTypes.js';
import {
	applyPlayerNames,
	sanitizePlayerName,
	sanitizePlayerNameEntries,
	PLAYER_NAME_MAX_LENGTH,
} from '../../src/transport/playerNameHelpers.js';

function createSessionSpy() {
	const updatePlayerName = vi.fn();
	const session = {
		updatePlayerName,
	} as unknown as EngineSession;
	return { session, updatePlayerName };
}

describe('sanitizePlayerName', () => {
	it('trims whitespace and returns undefined for empty names', () => {
		expect(sanitizePlayerName('  Voyager  ')).toBe('Voyager');
		expect(sanitizePlayerName('   ')).toBeUndefined();
	});

	it('rejects names that exceed the configured length', () => {
		const overLength = 'X'.repeat(PLAYER_NAME_MAX_LENGTH + 1);
		expect(() => sanitizePlayerName(overLength)).toThrow(TransportError);
	});
});

describe('sanitizePlayerNameEntries', () => {
	it('drops undefined or empty entries while preserving sanitized values', () => {
		const entries = sanitizePlayerNameEntries({
			A: '  Ranger  ',
			B: undefined,
			C: '   ',
			D: 'Scout',
		});
		expect(entries).toEqual([
			['A', 'Ranger'],
			['D', 'Scout'],
		]);
	});
});

describe('applyPlayerNames', () => {
	it('applies sanitized names to the session', () => {
		const { session, updatePlayerName } = createSessionSpy();
		applyPlayerNames(session, {
			A: '  Builder  ',
			B: undefined,
			C: 'Sentinel',
		});
		expect(updatePlayerName).toHaveBeenCalledTimes(2);
		expect(updatePlayerName).toHaveBeenNthCalledWith(1, 'A', 'Builder');
		expect(updatePlayerName).toHaveBeenNthCalledWith(2, 'C', 'Sentinel');
	});
});
