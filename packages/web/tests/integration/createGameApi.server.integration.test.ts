import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	createResourceV2Registries,
	resourceV2Definition,
	resourceV2GroupDefinition,
} from '@kingdom-builder/testing';
import { createGameApi } from '../../src/services/gameApi';
import {
	createSessionTransportPlugin,
	type FastifySessionTransportOptions,
} from '../../../server/src/transport/FastifySessionTransport.js';
import {
	createTokenAuthMiddleware,
	createSyntheticSessionManager,
	findAiPlayerId,
} from './serverTestUtils';
import type { SessionPlayerStateSnapshot } from './protocolTestTypes';

const runIntegration = process.env.KB_RUN_WEB_SERVER_INTEGRATION === 'true';

describe.skipIf(!runIntegration)(
	'createGameApi integration with Fastify transport',
	() => {
		const tokens = {
			'session-manager': {
				userId: 'session-manager',
				roles: ['session:create', 'session:advance', 'admin'],
			},
		} as const;
		const authorizationToken = 'session-manager';
		let server: FastifyInstance | undefined;
		let baseUrl = '';
		let actionId: string;
		let costKey: string;
		let manager: ReturnType<typeof createSyntheticSessionManager>['manager'];
		beforeAll(async () => {
			const resourceGroupDefinition = resourceV2GroupDefinition({
				parent: {
					label: 'Integration Economy',
					icon: '💼',
					description: 'Synthetic grouping for integration tests.',
				},
			});
			const resourceDefinition = resourceV2Definition({
				metadata: {
					label: 'Integration Gold',
					icon: '🪙',
					description: 'Synthetic resource for integration tests.',
					group: { id: resourceGroupDefinition.id },
				},
				bounds: { lowerBound: 0 },
			});
			const resourceCatalogV2 = createResourceV2Registries({
				resources: [resourceDefinition],
				groups: [resourceGroupDefinition],
			});
			const result = createSyntheticSessionManager({
				engineOptions: { resourceCatalogV2 },
			});
			({ manager, actionId, costKey } = result);
			server = fastify();
			const options: FastifySessionTransportOptions = {
				sessionManager: manager,
				authMiddleware: createTokenAuthMiddleware({ tokens }),
			};
			await server.register(createSessionTransportPlugin, options);
			await server.ready();
			const address = await server.listen({
				host: '127.0.0.1',
				port: 0,
			});
			baseUrl = address.replace(/\/$/, '');
		}, 30000);
		afterAll(async () => {
			if (server) {
				await server.close();
			}
		});
		const createApi = () => {
			if (!baseUrl) {
				throw new Error('Server was not started.');
			}
			return createGameApi({
				baseUrl,
				getAuthToken: () => authorizationToken,
			});
		};
		const expectPlayer = (player?: SessionPlayerStateSnapshot) => {
			expect(player).toBeDefined();
			if (!player) {
				throw new Error('Expected player snapshot to be available.');
			}
			return player;
		};
		it('returns action metadata from the live transport', async () => {
			const api = createApi();
			const created = await api.createSession();
			const { sessionId } = created;
			const costs = await api.getActionCosts({ sessionId, actionId });
			expect(costs.sessionId).toBe(sessionId);
			expect(costs.costs[costKey]).toBe(1);
			const requirements = await api.getActionRequirements({
				sessionId,
				actionId,
			});
			expect(requirements.sessionId).toBe(sessionId);
			expect(Array.isArray(requirements.requirements)).toBe(true);
			const options = await api.getActionOptions({
				sessionId,
				actionId,
			});
			expect(options.sessionId).toBe(sessionId);
			expect(Array.isArray(options.groups)).toBe(true);
		});
		it('fetches metadata snapshots from the live transport', async () => {
			const api = createApi();
			const metadata = await api.fetchMetadataSnapshot();

			expect(Object.keys(metadata.registries.actions)).not.toHaveLength(0);
			expect(metadata.metadata.assets).toBeDefined();
		});
		it('runs AI turns and simulations via HTTP endpoints', async () => {
			const api = createApi();
			const created = await api.createSession();
			const { sessionId, snapshot } = created;
			const players = snapshot.game.players;
			const humanPlayer =
				players.find((player) => !player.aiControlled) ?? players[0];
			const resolvedHuman = expectPlayer(humanPlayer);
			const session = manager.getSession(sessionId);
			expect(session).toBeDefined();
			if (!session) {
				throw new Error('Session was not created.');
			}
			const aiIdentifier = findAiPlayerId(session);
			expect(aiIdentifier).not.toBeNull();
			if (!aiIdentifier) {
				throw new Error('No AI controller was available.');
			}
			const aiResponse = await api.runAiTurn({
				sessionId,
				playerId: aiIdentifier,
			});
			expect(aiResponse.sessionId).toBe(sessionId);
			expect(typeof aiResponse.ranTurn).toBe('boolean');
			expect(aiResponse.snapshot.game.players).toHaveLength(players.length);
			const simulation = await api.simulateUpcomingPhases({
				sessionId,
				playerId: resolvedHuman.id,
			});
			expect(simulation.sessionId).toBe(sessionId);
			expect(simulation.result.playerId).toBe(resolvedHuman.id);
			expect(Array.isArray(simulation.result.steps)).toBe(true);
		});
	},
);
