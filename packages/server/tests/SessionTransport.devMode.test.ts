import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { GAME_START } from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../src/content/buildSessionMetadata.js';

const middleware = createTokenAuthMiddleware({
	tokens: {
		'session-manager': {
			userId: 'session-manager',
			roles: ['session:create', 'session:advance', 'admin'],
		},
	},
});

const authorizedHeaders = {
	authorization: 'Bearer session-manager',
} satisfies Record<string, string>;

describe('SessionTransport dev mode', () => {
	it('toggles developer mode on demand', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const updated = transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(updated.snapshot.game.devMode).toBe(true);
		expect(updated.registries.actions[actionId]).toBeDefined();
	});

	it('validates dev mode toggles before applying them', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const attempt = () =>
			transport.setDevMode({
				headers: authorizedHeaders,
				body: { sessionId: 123 },
			});
		expect(attempt).toThrow(TransportError);
		try {
			attempt();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('applies developer presets to the snapshot when enabling dev mode', () => {
		const metadata = buildSessionMetadata();
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session-preset'
				: undefined,
			authMiddleware: middleware,
		});
		const response = transport.createSession({
			body: { devMode: true },
			headers: authorizedHeaders,
		});
		expect(response.snapshot.game.devMode).toBe(true);
		const devModeConfig = GAME_START.modes?.dev;
		if (!devModeConfig) {
			throw new Error('Expected dev mode configuration in GAME_START.');
		}
		const presetPlayer = devModeConfig.player;
		const player = response.snapshot.game.players[0];
		if (!player) {
			throw new Error(
				'Expected at least one player in the developer snapshot.',
			);
		}
		if (presetPlayer?.resources) {
			for (const [key, expectedAmount] of Object.entries(
				presetPlayer.resources,
			)) {
				expect(metadata.resources?.[key]).toBeDefined();
				expect(player.resources[key]).toBe(expectedAmount);
			}
		}
		if (presetPlayer?.population) {
			for (const [role, expectedCount] of Object.entries(
				presetPlayer.population,
			)) {
				expect(metadata.populations?.[role]).toBeDefined();
				expect(player.population[role]).toBe(expectedCount);
			}
		}
		const opponentConfig = devModeConfig.players?.['B'];
		const opponent = response.snapshot.game.players[1];
		if (opponentConfig?.resources && opponent) {
			for (const [key, expectedAmount] of Object.entries(
				opponentConfig.resources,
			)) {
				expect(metadata.resources?.[key]).toBeDefined();
				expect(opponent.resources[key]).toBe(expectedAmount);
			}
		}
	});

	it('applies developer presets when toggling dev mode on', () => {
		const metadata = buildSessionMetadata();
		const manager = new SessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'dev-session-toggle'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: { devMode: false },
			headers: authorizedHeaders,
		});
		const response = transport.setDevMode({
			body: { sessionId, enabled: true },
			headers: authorizedHeaders,
		});
		expect(response.snapshot.game.devMode).toBe(true);
		const devModeConfig = GAME_START.modes?.dev;
		if (!devModeConfig) {
			throw new Error('Expected dev mode configuration in GAME_START.');
		}
		const presetPlayer = devModeConfig.player;
		const player = response.snapshot.game.players[0];
		if (!player) {
			throw new Error('Expected at least one player in the snapshot.');
		}
		if (presetPlayer?.resources) {
			for (const [key, expectedAmount] of Object.entries(
				presetPlayer.resources,
			)) {
				expect(metadata.resources?.[key]).toBeDefined();
				expect(player.resources[key]).toBe(expectedAmount);
			}
		}
		if (presetPlayer?.population) {
			for (const [role, expectedCount] of Object.entries(
				presetPlayer.population,
			)) {
				expect(metadata.populations?.[role]).toBeDefined();
				expect(player.population[role]).toBe(expectedCount);
			}
		}
	});
});
