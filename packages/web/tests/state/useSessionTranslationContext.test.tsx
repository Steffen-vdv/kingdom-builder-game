/** @vitest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { useSessionTranslationContext } from '../../src/state/useSessionTranslationContext';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import type { TranslationContext } from '../../src/translation/context';

const createTranslationContextMock = vi.fn(() => ({}) as TranslationContext);

vi.mock('../../src/translation/context', () => ({
	createTranslationContext: (
		...args: Parameters<typeof createTranslationContextMock>
	) => createTranslationContextMock(...args),
}));

describe('useSessionTranslationContext', () => {
	beforeEach(() => {
		createTranslationContextMock.mockClear();
	});

	it('forwards stat metadata to the translation context', () => {
		const playerA = createSnapshotPlayer({ id: 'A' });
		const playerB = createSnapshotPlayer({ id: 'B' });
		const phases = [
			{ id: 'phase:test', action: true, steps: [{ id: 'phase:test:start' }] },
		];
		const statsMetadata: SessionSnapshotMetadata['stats'] = {
			armyStrength: { icon: '⚔️', label: 'Army Strength' },
		};
		const sessionMetadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			stats: statsMetadata,
		};
		const sessionState = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases,
			actionCostResource: 'ap',
			ruleSnapshot: {
				tieredResourceKey: 'ap',
				tierDefinitions: [],
				winConditions: [],
			},
			metadata: sessionMetadata,
		});
		const registries = createSessionRegistries();

		function Harness() {
			useSessionTranslationContext({
				sessionState,
				registries,
				ruleSnapshot: sessionState.rules,
				sessionMetadata,
				cachedSessionSnapshot: sessionState,
				onFatalSessionError: undefined,
			});
			return null;
		}

		render(<Harness />);

		expect(createTranslationContextMock).toHaveBeenCalled();
		const [, , metadataArg] = createTranslationContextMock.mock.calls[0] ?? [];
		expect(metadataArg?.stats?.armyStrength?.icon).toBe('⚔️');
		expect(metadataArg?.stats?.armyStrength?.label).toBe('Army Strength');
	});
});
