import { describe, it, expect } from 'vitest';
import { SessionTransport } from '../src/transport/SessionTransport.js';
import { TransportError } from '../src/transport/TransportTypes.js';
import { createTokenAuthMiddleware } from '../src/auth/tokenAuthMiddleware.js';
import { createSyntheticSessionManager } from './helpers/createSyntheticSessionManager.js';

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

describe('SessionTransport describeAction', () => {
	it('describes actions using engine projections', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const session = manager.getSession(sessionId);
		expect(session).toBeDefined();
		if (!session) {
			throw new Error('Expected session to be available.');
		}
		const response = transport.describeAction({
			body: { sessionId, actionId },
			headers: authorizedHeaders,
		});
		const expectedDefinition = session.getActionDefinition(actionId);
		const expectedOptions = session.getActionOptions(actionId);
		const expectedCosts = session.getActionCosts(actionId);
		const expectedRequirements = session.getActionRequirements(actionId);
		expect(response.sessionId).toBe(sessionId);
		expect(response.actionId).toBe(actionId);
		expect(response.definition).toEqual(expectedDefinition);
		expect(response.options).toEqual(expectedOptions);
		expect(response.costs).toEqual(expectedCosts);
		expect(response.requirements).toEqual(expectedRequirements);
	});

	it('validates session identifiers', () => {
		const { manager, actionId } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const attempt = () =>
			transport.describeAction({
				body: { actionId },
				headers: authorizedHeaders,
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

	it('throws when actions are not registered', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const expectNotFound = () =>
			transport.describeAction({
				body: { sessionId, actionId: 'missing-action' },
				headers: authorizedHeaders,
			});
		expect(expectNotFound).toThrow(TransportError);
		try {
			expectNotFound();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('NOT_FOUND');
			}
		}
	});
});
