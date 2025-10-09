import { describe, expect, it, vi } from 'vitest';
import type { SessionGateway } from '@kingdom-builder/protocol';
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
});
