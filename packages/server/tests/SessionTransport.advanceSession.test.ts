import { describe, it, expect, vi } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';
import {
	createMetadataBuilderWithOverview,
	SYNTHETIC_OVERVIEW,
} from './helpers/metadataFixtures.js';

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

describe('SessionTransport advanceSession', () => {
	it('advances sessions and reports results', async () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('advance-session'),
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const advance = await transport.advanceSession({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(advance.sessionId).toBe(sessionId);
		expect(advance.snapshot.game.currentPhase).toBe('end');
		expect(Array.isArray(advance.advance.effects)).toBe(true);
		expect(advance.registries.actions[actionId]).toBeDefined();
	});

	it('reports conflicts when advancing sessions fail', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = manager.getSession(sessionId);
		const conflict = new Error('advance failed');
		if (session) {
			vi.spyOn(session, 'enqueue').mockImplementation(() =>
				Promise.reject(conflict),
			);
		}
		await expect(
			transport.advanceSession({
				body: { sessionId },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
			}
		}
	});

	it('validates incoming requests', async () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: vi.fn().mockReturnValue('validation-session'),
			authMiddleware: middleware,
		});
		await expect(
			transport.advanceSession({
				body: { sessionId: '' },
				headers: authorizedHeaders,
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId: '' },
				headers: authorizedHeaders,
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('INVALID_REQUEST');
			}
		}
	});

	it('rejects tokens that are not authorized for actions', async () => {
		const { manager } = createSyntheticSessionManager();
		const limited = createTokenAuthMiddleware({
			tokens: {
				'creator-only': {
					userId: 'creator',
					roles: ['session:create'],
				},
			},
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: limited,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: { authorization: 'Bearer creator-only' },
		});
		await expect(
			transport.advanceSession({
				body: { sessionId },
				headers: { authorization: 'Bearer creator-only' },
			}),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await transport.advanceSession({
				body: { sessionId },
				headers: { authorization: 'Bearer creator-only' },
			});
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});

	it('retains metadata descriptors and overview after advancing sessions', async () => {
		const metadataBuilder = createMetadataBuilderWithOverview();
		const { manager, costKey, gainKey } = createSyntheticSessionManager({
			metadataBuilder,
		});
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const expectedOverview = structuredClone(SYNTHETIC_OVERVIEW);
		const advance = await transport.advanceSession({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		const metadata = advance.snapshot.metadata;
		expect(metadata.resources?.[costKey]).toEqual({ label: costKey });
		expect(metadata.resources?.[gainKey]).toEqual({ label: gainKey });
		expect(metadata.overview).toEqual(expectedOverview);
		if (metadata.resources?.[costKey]) {
			metadata.resources[costKey]!.label = '__mutated__';
		}
		if (metadata.resources?.[gainKey]) {
			metadata.resources[gainKey]!.label = '__mutated__';
		}
		if (metadata.overview) {
			metadata.overview.hero.tokens.extra = 'mutated';
			const resourceTokens = metadata.overview.tokens.resources;
			const tokenList = resourceTokens
				? (resourceTokens[costKey] ?? resourceTokens[gainKey])
				: undefined;
			if (tokenList) {
				tokenList.push('advance-mutation');
			}
		}
		const refreshed = transport.getSessionState({
			body: { sessionId },
			headers: {},
		});
		const nextMetadata = refreshed.snapshot.metadata;
		expect(nextMetadata.resources?.[costKey]?.label).toBe(costKey);
		expect(nextMetadata.resources?.[gainKey]?.label).toBe(gainKey);
		expect(nextMetadata.overview).toEqual(expectedOverview);
		expect(nextMetadata.overview).not.toBe(metadata.overview);
	});
});
