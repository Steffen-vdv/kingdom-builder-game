import { describe, expect, it } from 'vitest';
import {
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
} from '../src/config/session_contracts';
import type {
	SessionRunAiRequest,
	SessionRunAiResponse,
} from '../src/session/contracts';
import type { SessionAdvanceResult, SessionSnapshot } from '../src/session';

describe('sessionRunAiRequestSchema', () => {
	it('accepts a minimal request', () => {
		const request: SessionRunAiRequest = {
			sessionId: 'session-123',
			playerId: 'A',
		};
		expect(sessionRunAiRequestSchema.parse(request)).toEqual(request);
	});

	it('accepts overrides payloads', () => {
		const request: SessionRunAiRequest = {
			sessionId: 'session-456',
			playerId: 'B',
			overrides: {
				mode: 'proxy',
			},
		};
		expect(sessionRunAiRequestSchema.parse(request)).toEqual(request);
	});
});

describe('sessionRunAiResponseSchema', () => {
	it('parses a response including an advance snapshot', () => {
		const snapshot = {} as SessionSnapshot;
		const advance = {} as SessionAdvanceResult;
		const response: SessionRunAiResponse = {
			sessionId: 'session-789',
			snapshot,
			ranTurn: true,
			advance,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: {},
			},
		};
		expect(sessionRunAiResponseSchema.parse(response)).toEqual(response);
	});

	it('parses a response without advance data', () => {
		const snapshot = {} as SessionSnapshot;
		const response: SessionRunAiResponse = {
			sessionId: 'session-000',
			snapshot,
			ranTurn: false,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: {},
			},
		};
		expect(sessionRunAiResponseSchema.parse(response)).toEqual(response);
	});
});
