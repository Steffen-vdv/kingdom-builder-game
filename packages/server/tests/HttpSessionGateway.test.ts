import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type {
	SessionGateway,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol';
import {
	HttpSessionGateway,
	type HttpSessionGatewayOptions,
} from '../src/client/HttpSessionGateway.js';
import { TransportError } from '../src/transport/TransportTypes.js';

describe('HttpSessionGateway', () => {
	const baseUrl = 'https://gateway.test/api';

	function createGateway(
		options: Partial<HttpSessionGatewayOptions> = {},
	): SessionGateway {
		return new HttpSessionGateway({
			baseUrl,
			headers: { authorization: 'Bearer token' },
			...options,
		});
	}

	function jsonResponse(body: unknown, init?: ResponseInit): Response {
		return new Response(JSON.stringify(body), {
			status: init?.status ?? 200,
			headers: { 'content-type': 'application/json' },
		});
	}

	function createRegistries(): SessionRegistriesPayload {
		return {
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
		};
	}

	it('creates sessions through the REST transport', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe('/api/sessions');
				const payload = await request.clone().json();
				expect(payload).toEqual({ devMode: true });
				expect(request.headers.get('authorization')).toBe('Bearer token');
				return jsonResponse(
					{
						sessionId: 'rest-session',
						snapshot: { game: { devMode: true } },
						registries: createRegistries(),
					},
					{ status: 201 },
				);
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.createSession({ devMode: true });
		expect(response.sessionId).toBe('rest-session');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('throws transport errors for non-success responses', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('POST');
			return Promise.resolve(
				jsonResponse(
					{ code: 'UNAUTHORIZED', message: 'Missing token.' },
					{ status: 401 },
				),
			);
		});
		const gateway = createGateway({ fetch });
		await expect(gateway.createSession()).rejects.toBeInstanceOf(
			TransportError,
		);
		try {
			await gateway.createSession();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('UNAUTHORIZED');
				expect(error.message).toBe('Missing token.');
			}
		}
	});

	it('fetches session snapshots', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('GET');
			expect(new URL(request.url).pathname).toBe('/api/sessions/test/snapshot');
			expect(request.headers.get('authorization')).toBe('Bearer token');
			return Promise.resolve(
				jsonResponse({
					sessionId: 'test',
					snapshot: { game: { players: [] } },
					registries: createRegistries(),
				}),
			);
		});
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchSnapshot({ sessionId: 'test' });
		expect(response.sessionId).toBe('test');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('advances sessions and validates responses', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('POST');
			expect(new URL(request.url).pathname).toBe('/api/sessions/test/advance');
			return Promise.resolve(
				jsonResponse({
					sessionId: 'test',
					snapshot: { game: { currentPhase: 'growth' } },
					advance: { effects: [] },
					registries: createRegistries(),
				}),
			);
		});
		const gateway = createGateway({ fetch });
		const response = await gateway.advancePhase({ sessionId: 'test' });
		expect(response.advance.effects).toEqual([]);
	});

	it('performs actions and returns success payloads', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
					'/api/sessions/test/actions',
				);
				const payload = await request.clone().json();
				expect(payload).toEqual({ sessionId: 'test', actionId: 'gain' });
				return jsonResponse({
					status: 'success',
					snapshot: { game: { players: [] } },
					costs: {},
					traces: [],
				});
			},
		);
		const gateway = createGateway({ fetch });
		const result = await gateway.performAction({
			sessionId: 'test',
			actionId: 'gain',
		});
		expect(result.status).toBe('success');
		expect(result.costs).toEqual({});
	});

	it('returns protocol errors for failed actions', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('POST');
			return Promise.resolve(
				jsonResponse(
					{ status: 'error', error: 'Action failed.' },
					{ status: 409 },
				),
			);
		});
		const gateway = createGateway({ fetch });
		const result = await gateway.performAction({
			sessionId: 'test',
			actionId: 'fail',
		});
		expect(result.status).toBe('error');
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it('updates developer mode using the REST endpoint', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
					'/api/sessions/test/dev-mode',
				);
				const payload = await request.clone().json();
				expect(payload).toEqual({ enabled: true });
				return jsonResponse({
					sessionId: 'test',
					snapshot: { game: { devMode: true } },
					registries: createRegistries(),
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.setDevMode({
			sessionId: 'test',
			enabled: true,
		});
		expect(response.snapshot.game.devMode).toBe(true);
	});

	it('fetches action costs from the REST transport', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
					'/api/sessions/test/actions/build/costs',
				);
				const payload = await request.clone().json();
				expect(payload).toEqual({
					sessionId: 'test',
					actionId: 'build',
					params: { target: 'farm' },
				});
				return jsonResponse({
					sessionId: 'test',
					costs: { gold: 2 },
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionCosts({
			sessionId: 'test',
			actionId: 'build',
			params: { target: 'farm' },
		});
		expect(response.costs).toEqual({ gold: 2 });
	});

	it('throws transport errors when fetching action costs fails', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(jsonResponse({ message: 'No action.' }, { status: 404 })),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionCosts({
				sessionId: 'missing',
				actionId: 'unknown',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates action cost requests before sending them', async () => {
		const gateway = createGateway();
		await expect(
			gateway.fetchActionCosts({
				// @ts-expect-error: exercising validation failures
				sessionId: '',
				actionId: '',
			}),
		).rejects.toBeInstanceOf(ZodError);
	});

	it('fetches action requirements from the REST transport', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request ? input : new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
					'/api/sessions/test/actions/build/requirements',
				);
				const payload = await request.clone().json();
				expect(payload).toEqual({
					sessionId: 'test',
					actionId: 'build',
					params: { target: 'farm' },
				});
				return jsonResponse({
					sessionId: 'test',
					requirements: [
						{
							requirement: {
								type: 'resource',
								method: 'minimum',
								params: { resourceId: 'gold' },
								message: 'Needs gold.',
							},
							details: { amount: 2 },
							message: 'Met',
						},
					],
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionRequirements({
			sessionId: 'test',
			actionId: 'build',
			params: { target: 'farm' },
		});
		expect(response.requirements).toEqual([
			{
				requirement: {
					type: 'resource',
					method: 'minimum',
					params: { resourceId: 'gold' },
					message: 'Needs gold.',
				},
				details: { amount: 2 },
				message: 'Met',
			},
		]);
	});

	it('throws transport errors when fetching requirements fails', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse({ message: 'No requirements.' }, { status: 409 }),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionRequirements({
				sessionId: 'test',
				actionId: 'failure',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates action requirement requests before sending them', async () => {
		const gateway = createGateway();
		await expect(
			gateway.fetchActionRequirements({
				// @ts-expect-error: exercising validation failures
				sessionId: '',
				actionId: '',
			}),
		).rejects.toBeInstanceOf(ZodError);
	});

	it('fetches action options from the REST transport', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('GET');
			expect(new URL(request.url).pathname).toBe(
				'/api/sessions/test/actions/build/options',
			);
			return Promise.resolve(
				jsonResponse({
					sessionId: 'test',
					groups: [],
				}),
			);
		});
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionOptions({
			sessionId: 'test',
			actionId: 'build',
		});
		expect(response.groups).toEqual([]);
	});

	it('throws transport errors when fetching options fails', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse({ message: 'Options unavailable.' }, { status: 500 }),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionOptions({
				sessionId: 'test',
				actionId: 'broken',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates action option requests before sending them', async () => {
		const gateway = createGateway();
		await expect(
			gateway.fetchActionOptions({
				// @ts-expect-error: exercising validation failures
				sessionId: '',
				actionId: '',
			}),
		).rejects.toBeInstanceOf(ZodError);
	});

	it('runs AI turns remotely', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('POST');
			expect(new URL(request.url).pathname).toBe(
				'/api/sessions/test/players/A/ai/turn',
			);
			return Promise.resolve(
				jsonResponse({
					sessionId: 'test',
					snapshot: { game: { players: [] } },
					registries: createRegistries(),
					ranTurn: true,
				}),
			);
		});
		const gateway = createGateway({ fetch });
		const response = await gateway.runAiTurn({
			sessionId: 'test',
			playerId: 'A',
		});
		expect(response.ranTurn).toBe(true);
	});

	it('throws transport errors when AI execution fails', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse({ message: 'AI unavailable.' }, { status: 409 }),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.runAiTurn({
				sessionId: 'test',
				playerId: 'A',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates AI turn requests before sending them', async () => {
		const gateway = createGateway();
		await expect(
			gateway.runAiTurn({
				// @ts-expect-error: exercising validation failures
				sessionId: '',
				playerId: '',
			}),
		).rejects.toBeInstanceOf(ZodError);
	});

	it('simulates upcoming phases remotely', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.method).toBe('POST');
			expect(new URL(request.url).pathname).toBe(
				'/api/sessions/test/players/A/simulate',
			);
			return Promise.resolve(
				jsonResponse({
					sessionId: 'test',
					result: { phases: [] },
				}),
			);
		});
		const gateway = createGateway({ fetch });
		const response = await gateway.simulateUpcomingPhases({
			sessionId: 'test',
			playerId: 'A',
			options: { maxIterations: 2 },
		});
		expect(response.result).toEqual({ phases: [] });
	});

	it('throws transport errors when simulations fail', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse({ message: 'Simulation error.' }, { status: 400 }),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.simulateUpcomingPhases({
				sessionId: 'test',
				playerId: 'A',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates simulation requests before sending them', async () => {
		const gateway = createGateway();
		await expect(
			gateway.simulateUpcomingPhases({
				// @ts-expect-error: exercising validation failures
				sessionId: '',
				playerId: '',
			}),
		).rejects.toBeInstanceOf(ZodError);
	});

	it('supports asynchronous header factories', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.headers.get('x-test-header')).toBe('dynamic');
			return Promise.resolve(
				jsonResponse({
					sessionId: 'dynamic',
					snapshot: { game: {} },
					registries: createRegistries(),
				}),
			);
		});
		const gateway = new HttpSessionGateway({
			baseUrl,
			fetch,
			headers: () => Promise.resolve({ 'X-Test-Header': 'dynamic' }),
		});
		const response = await gateway.createSession();
		expect(response.sessionId).toBe('dynamic');
	});

	it('provides empty header objects when none are configured', async () => {
		const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
			const request =
				input instanceof Request ? input : new Request(input, init);
			expect(request.headers.get('authorization')).toBeNull();
			return Promise.resolve(
				jsonResponse({
					sessionId: 'basic',
					snapshot: { game: { players: [] } },
					registries: createRegistries(),
				}),
			);
		});
		const gateway = new HttpSessionGateway({ baseUrl, fetch });
		const response = await gateway.fetchSnapshot({ sessionId: 'basic' });
		expect(response.sessionId).toBe('basic');
	});

	it('uses status codes when payload code is invalid', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse({ code: 'UNKNOWN', message: 'nope' }, { status: 403 }),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(gateway.createSession()).rejects.toBeInstanceOf(
			TransportError,
		);
		try {
			await gateway.createSession();
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('FORBIDDEN');
			}
		}
	});

	it('uses generic conflict errors when payloads lack details', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(new Response('', { status: 502 })),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.performAction({ sessionId: 'x', actionId: 'y' }),
		).rejects.toBeInstanceOf(TransportError);
		try {
			await gateway.performAction({ sessionId: 'x', actionId: 'y' });
		} catch (error) {
			if (error instanceof TransportError) {
				expect(error.code).toBe('CONFLICT');
				expect(error.message).toContain('502');
			}
		}
	});

	it('raises descriptive errors for malformed JSON responses', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(new Response('not-json', { status: 200 })),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchSnapshot({ sessionId: 'broken' }),
		).rejects.toThrow(/Failed to parse response/);
	});

	it('throws when the Fetch API is unavailable', () => {
		const original = globalThis.fetch;
		// @ts-expect-error: simulating environments without fetch support
		delete (globalThis as { fetch?: typeof globalThis.fetch }).fetch;
		try {
			expect(() => new HttpSessionGateway({ baseUrl })).toThrow(
				/Fetch API is not available/,
			);
		} finally {
			if (original) {
				globalThis.fetch = original;
			}
		}
	});
});
