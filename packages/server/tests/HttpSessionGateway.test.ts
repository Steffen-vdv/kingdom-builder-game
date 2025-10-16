/* eslint-disable max-len */
import { describe, expect, it, vi } from 'vitest';
import type { SessionRegistriesPayload } from '@kingdom-builder/protocol';
import {
	HttpSessionGateway,
	type HttpSessionGatewayOptions,
} from '../src/client/HttpSessionGateway.js';
import { TransportError } from '../src/transport/TransportTypes.js';

describe('HttpSessionGateway', () => {
	const baseUrl = 'https://gateway.test/api';

	function createGateway(
		options: Partial<HttpSessionGatewayOptions> = {},
	): HttpSessionGateway {
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
					input instanceof Request
						? input
						: new Request(input, init);
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
					input instanceof Request
						? input
						: new Request(input, init);
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
					input instanceof Request
						? input
						: new Request(input, init);
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

        it('fetches action costs through the REST endpoint', async () => {
                const fetch = vi.fn(
                        async (input: RequestInfo | URL, init?: RequestInit) => {
                                const request =
                                        input instanceof Request ? input : new Request(input, init);
                                expect(request.method).toBe('POST');
                                expect(new URL(request.url).pathname).toBe(
                                        '/api/sessions/test/actions/build%2Fkeep/costs',
                                );
                                const payload = await request.clone().json();
                                expect(payload).toEqual({
                                        sessionId: 'test',
                                        actionId: 'build/keep',
                                });
                                return jsonResponse({
                                        sessionId: 'test',
                                        costs: { gold: 4 },
                                });
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionCosts({
			sessionId: 'test',
                        actionId: 'build/keep',
                });
                expect(response.costs).toEqual({ gold: 4 });
        });

	it('propagates transport errors from action cost lookup', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse(
					{ code: 'NOT_FOUND', message: 'Missing action.' },
					{ status: 404 },
				),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
                        gateway.fetchActionCosts({
                                sessionId: 'test',
                                actionId: 'missing',
                        }),
                ).rejects.toBeInstanceOf(TransportError);
        });

	it('validates action cost requests before dispatching', async () => {
		const fetch = vi.fn();
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionCosts({
				sessionId: '',
				actionId: '',
			} as never),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('fetches action requirements through the REST endpoint', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request
						? input
						: new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
                                        '/api/sessions/test/actions/build%20dock/requirements',
                                );
                                const payload = await request.clone().json();
                                expect(payload).toEqual({
                                        sessionId: 'test',
                                        actionId: 'build dock',
                                        params: { choices: { slot: { optionId: 'farm' } } },
                                });
				return jsonResponse({
					sessionId: 'test',
					requirements: [
						{
							requirement: {
								type: 'resource',
								method: 'minimum',
								params: {
									resourceKey: 'gold',
									amount: 1,
								},
							},
							message: 'Need gold',
						},
					],
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionRequirements({
			sessionId: 'test',
                        actionId: 'build dock',
                        params: { choices: { slot: { optionId: 'farm' } } },
                });
                expect(response.requirements).toHaveLength(1);
        });

	it('propagates transport errors from action requirement lookup', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse(
					{ code: 'CONFLICT', message: 'Requirement failure.' },
					{ status: 409 },
				),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
                        gateway.fetchActionRequirements({
                                sessionId: 'test',
                                actionId: 'build',
                        }),
                ).rejects.toBeInstanceOf(TransportError);
        });

	it('validates action requirement requests before dispatching', async () => {
		const fetch = vi.fn();
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionRequirements({
				sessionId: 'test',
				actionId: '',
			} as never),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('fetches action options through the REST endpoint', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request
						? input
						: new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
                                        '/api/sessions/test/actions/choose%3Aoption/options',
                                );
                                const payload = await request.clone().json();
                                expect(payload).toEqual({
                                        sessionId: 'test',
                                        actionId: 'choose:option',
                                });
				return jsonResponse({
					sessionId: 'test',
					groups: [
						{
							id: 'group',
							title: 'Choices',
							options: [
								{
									id: 'option',
									actionId: 'child',
									label: 'Pick',
								},
							],
						},
					],
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.fetchActionOptions({
			sessionId: 'test',
                        actionId: 'choose:option',
                });
                expect(response.groups).toHaveLength(1);
        });

	it('propagates transport errors from action option lookup', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse(
					{ code: 'NOT_FOUND', message: 'Missing options.' },
					{ status: 404 },
				),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.fetchActionOptions({
				sessionId: 'test',
				actionId: 'choose',
			}),
		).rejects.toBeInstanceOf(TransportError);
	});

        it('validates action option requests before dispatching', async () => {
                const fetch = vi.fn();
                const gateway = createGateway({ fetch });
                await expect(
                        gateway.fetchActionOptions({
                                sessionId: '',
                                actionId: 'choose',
                        } as never),
                ).rejects.toThrow();
                expect(fetch).not.toHaveBeenCalled();
        });

        it('routes action metadata lookups through the public gateway export', async () => {
                const module = await import('../src/index.js');
                const fetch = vi.fn(
                        async (input: RequestInfo | URL, init?: RequestInit) => {
                                const request =
                                        input instanceof Request ? input : new Request(input, init);
                                expect(new URL(request.url).pathname).toBe(
                                        '/api/sessions/test/actions/export%2Ftest/costs',
                                );
                                const payload = await request.clone().json();
                                expect(payload).toEqual({
                                        sessionId: 'test',
                                        actionId: 'export/test',
                                });
                                return jsonResponse({ sessionId: 'test', costs: {} });
                        },
                );
                const gateway = new module.HttpSessionGateway({ baseUrl, fetch });
                const response = await gateway.getActionCosts({
                        sessionId: 'test',
                        actionId: 'export/test',
                });
                expect(response.sessionId).toBe('test');
                expect(fetch).toHaveBeenCalledTimes(1);
        });

	it('runs AI turns via the REST endpoint', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request
						? input
						: new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe('/api/sessions/test/ai');
				const payload = await request.clone().json();
				expect(payload).toEqual({ sessionId: 'test', playerId: 'A' });
				return jsonResponse({
					sessionId: 'test',
					snapshot: { game: { players: [] } },
					registries: createRegistries(),
					ranTurn: true,
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.runAiTurn({
			sessionId: 'test',
			playerId: 'A',
		});
		expect(response.ranTurn).toBe(true);
	});

	it('propagates transport errors from AI runs', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse(
					{ code: 'FORBIDDEN', message: 'AI disabled.' },
					{ status: 403 },
				),
			),
		);
		const gateway = createGateway({ fetch });
		await expect(
			gateway.runAiTurn({ sessionId: 'test', playerId: 'A' }),
		).rejects.toBeInstanceOf(TransportError);
	});

	it('validates AI run requests before dispatching', async () => {
		const fetch = vi.fn();
		const gateway = createGateway({ fetch });
		await expect(
			gateway.runAiTurn({
				sessionId: 'test',
				playerId: 'C',
			} as never),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
	});

	it('simulates upcoming phases via the REST endpoint', async () => {
		const fetch = vi.fn(
			async (input: RequestInfo | URL, init?: RequestInit) => {
				const request =
					input instanceof Request
						? input
						: new Request(input, init);
				expect(request.method).toBe('POST');
				expect(new URL(request.url).pathname).toBe(
					'/api/sessions/test/simulate',
				);
				const payload = await request.clone().json();
				expect(payload).toEqual({
					sessionId: 'test',
					playerId: 'A',
					options: { maxIterations: 3 },
				});
				return jsonResponse({
					sessionId: 'test',
					result: { summary: 'ok' },
				});
			},
		);
		const gateway = createGateway({ fetch });
		const response = await gateway.simulateUpcomingPhases({
			sessionId: 'test',
			playerId: 'A',
			options: { maxIterations: 3 },
		});
		expect(response.result).toEqual({ summary: 'ok' });
	});

	it('propagates transport errors from simulation requests', async () => {
		const fetch = vi.fn(() =>
			Promise.resolve(
				jsonResponse(
					{ code: 'INVALID_REQUEST', message: 'Bad options.' },
					{ status: 400 },
				),
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

	it('validates simulation requests before dispatching', async () => {
		const fetch = vi.fn();
		const gateway = createGateway({ fetch });
		await expect(
			gateway.simulateUpcomingPhases({
				sessionId: 'test',
				playerId: 'Z',
			} as never),
		).rejects.toThrow();
		expect(fetch).not.toHaveBeenCalled();
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
