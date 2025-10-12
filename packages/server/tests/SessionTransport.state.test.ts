import { describe, it, expect } from 'vitest';
import {
	RESOURCES,
	TRIGGER_INFO,
	OVERVIEW_CONTENT,
} from '@kingdom-builder/contents';
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

describe('SessionTransport session state', () => {
	it('returns session state snapshots', () => {
		const { manager, actionId, costKey, gainKey } =
			createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'state-session'
				: undefined,
			authMiddleware: middleware,
		});
		const { sessionId } = transport.createSession({
			body: {},
			headers: authorizedHeaders,
		});
		const state = transport.getSessionState({
			body: { sessionId },
			headers: authorizedHeaders,
		});
		expect(state.sessionId).toBe(sessionId);
		expect(state.snapshot.game.players).toHaveLength(2);
		expect(state.registries.actions[actionId]).toBeDefined();
		expect(state.registries.resources[costKey]).toMatchObject({ key: costKey });
		expect(state.registries.resources[gainKey]).toMatchObject({ key: gainKey });
		const registriesWithMetadata =
			state.registries as typeof state.registries & {
				metadata?: {
					resources?: Record<string, { label?: string; icon?: string }>;
					triggers?: Record<
						string,
						{ label?: string; icon?: string; future?: string; past?: string }
					>;
					overviewContent?: { hero?: { title?: string; badgeLabel?: string } };
				};
			};
		expect(registriesWithMetadata.metadata).toBeDefined();
		const metadata = registriesWithMetadata.metadata;
		if (!metadata) {
			throw new Error(
				'Expected registry metadata in the session state response.',
			);
		}
		const [resourceKey, resourceDescriptor] =
			Object.entries(RESOURCES).find(([, entry]) => entry.label) ?? [];
		if (!resourceKey || !resourceDescriptor.label) {
			throw new Error('Expected at least one resource descriptor in contents.');
		}
		expect(metadata.resources?.[resourceKey]).toMatchObject({
			label: resourceDescriptor.label,
			icon: resourceDescriptor.icon,
		});
		const [triggerKey, triggerDescriptor] =
			Object.entries(TRIGGER_INFO).find(
				([, entry]) => entry.future || entry.past,
			) ?? [];
		if (!triggerKey) {
			throw new Error('Expected at least one trigger descriptor in contents.');
		}
		expect(metadata.triggers?.[triggerKey]).toMatchObject({
			label: triggerDescriptor.past ?? triggerDescriptor.future ?? triggerKey,
			future: triggerDescriptor.future,
			past: triggerDescriptor.past,
		});
		expect(metadata.overviewContent?.hero).toMatchObject({
			title: OVERVIEW_CONTENT.hero.title,
			badgeLabel: OVERVIEW_CONTENT.hero.badgeLabel,
		});
	});

	it('throws when a session cannot be located', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
			idFactory: expect.getState().currentTestName
				? () => 'missing-session'
				: undefined,
			authMiddleware: middleware,
		});
		const expectNotFound = () =>
			transport.getSessionState({
				body: { sessionId: 'missing' },
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

	it('validates session identifiers before fetching state', () => {
		const { manager } = createSyntheticSessionManager();
		const transport = new SessionTransport({
			sessionManager: manager,
		});
		const attempt = () =>
			transport.getSessionState({
				body: {},
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
});
