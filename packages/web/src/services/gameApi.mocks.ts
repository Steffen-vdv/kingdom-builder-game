import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
	ActionExecuteSuccessResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol/session';
import type { GameApi } from './gameApi';
import { GameApiError } from './gameApi';

type CloneFn = <T>(value: T) => T;

const deepClone = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
	if (value === null || typeof value !== 'object') {
		return value;
	}

	const cached = seen.get(value as object);
	if (cached) {
		return cached as T;
	}

	if (value instanceof Date) {
		const result = new Date(value.getTime());
		seen.set(value, result);
		return result as unknown as T;
	}

	if (Array.isArray(value)) {
		const source = value as unknown[];
		const result = source.map((item) => deepClone(item, seen));
		seen.set(value, result);
		return result as unknown as T;
	}

	if (value instanceof Map) {
		const source = value as Map<unknown, unknown>;
		const result = new Map<unknown, unknown>();
		seen.set(value, result);
		for (const [key, entry] of source.entries()) {
			const clonedKey = deepClone(key, seen);
			const clonedEntry = deepClone(entry, seen);
			result.set(clonedKey, clonedEntry);
		}
		return result as unknown as T;
	}

	if (value instanceof Set) {
		const source = value as Set<unknown>;
		const result = new Set<unknown>();
		seen.set(value, result);
		for (const entry of source.values()) {
			const clonedEntry = deepClone(entry, seen);
			result.add(clonedEntry);
		}
		return result as unknown as T;
	}

	if (value instanceof RegExp) {
		const result = new RegExp(value.source, value.flags);
		seen.set(value, result);
		return result as unknown as T;
	}

	const objectValue = value as Record<string, unknown>;
	const prototype = Object.getPrototypeOf(objectValue) as object | null;
	if (prototype === null || prototype === Object.prototype) {
		const result: Record<string, unknown> = {};
		seen.set(value as object, result);
		const entries = Object.entries(objectValue);
		for (const [key, entry] of entries) {
			result[key] = deepClone(entry, seen);
		}
		return result as unknown as T;
	}

	return value;
};

const clone: CloneFn = (value) => {
	if (typeof structuredClone === 'function') {
		const cloneFn = structuredClone as unknown as <U>(input: U) => U;
		try {
			return cloneFn(value);
		} catch (error) {
			// Fall through to manual deep clone when structuredClone cannot
			// process the provided value (e.g., functions or symbols).
		}
	}

	return deepClone(value);
};

const toStateResponse = (
	response: SessionCreateResponse,
): SessionStateResponse => ({
	sessionId: response.sessionId,
	snapshot: clone(response.snapshot),
	registries: clone(response.registries),
});

export type GameApiMockHandlers = {
	createSession?: (
		request: SessionCreateRequest,
	) => Promise<SessionCreateResponse> | SessionCreateResponse;
	fetchSnapshot?: (
		sessionId: string,
	) => Promise<SessionStateResponse> | SessionStateResponse;
	performAction?: (
		request: ActionExecuteRequest,
	) => Promise<ActionExecuteResponse> | ActionExecuteResponse;
	advancePhase?: (
		request: SessionAdvanceRequest,
	) => Promise<SessionAdvanceResponse> | SessionAdvanceResponse;
};

export const createGameApiMock = (
	handlers: GameApiMockHandlers = {},
): GameApi => ({
	createSession: (request: SessionCreateRequest = {}) => {
		if (!handlers.createSession) {
			throw new Error('createSession handler not provided.');
		}

		return Promise.resolve(handlers.createSession(request));
	},
	fetchSnapshot: (sessionId: string) => {
		if (!handlers.fetchSnapshot) {
			return Promise.reject(new Error('fetchSnapshot handler not provided.'));
		}

		return Promise.resolve(handlers.fetchSnapshot(sessionId));
	},
	performAction: (request: ActionExecuteRequest) => {
		if (!handlers.performAction) {
			return Promise.reject(new Error('performAction handler not provided.'));
		}

		return Promise.resolve(handlers.performAction(request));
	},
	advancePhase: (request: SessionAdvanceRequest) => {
		if (!handlers.advancePhase) {
			return Promise.reject(new Error('advancePhase handler not provided.'));
		}

		return Promise.resolve(handlers.advancePhase(request));
	},
});

export interface GameApiFakeState {
	sessions?: Map<string, SessionStateResponse>;
}

export class GameApiFake implements GameApi {
	#sessions: Map<string, SessionStateResponse>;
	#nextCreate: SessionCreateResponse | undefined;
	#nextAdvance: SessionAdvanceResponse | undefined;
	#nextAction: ActionExecuteResponse | undefined;

	constructor(state: GameApiFakeState = {}) {
		this.#sessions = state.sessions ?? new Map<string, SessionStateResponse>();
	}

	setNextCreateResponse(response: SessionCreateResponse) {
		this.#nextCreate = clone(response);
	}

	setNextAdvanceResponse(response: SessionAdvanceResponse) {
		this.#nextAdvance = clone(response);
	}

	setNextActionResponse(response: ActionExecuteResponse) {
		this.#nextAction = clone(response);
	}

	primeSession(response: SessionStateResponse) {
		this.#sessions.set(response.sessionId, clone(response));
	}

	createSession(
		_request: SessionCreateRequest = {},
	): Promise<SessionCreateResponse> {
		const response = this.#consumeCreate();

		this.#sessions.set(response.sessionId, toStateResponse(response));

		return Promise.resolve(clone(response));
	}

	fetchSnapshot(sessionId: string): Promise<SessionStateResponse> {
		const session = this.#sessions.get(sessionId);

		if (!session) {
			return Promise.reject(
				new GameApiError('Unknown session.', 404, 'Not Found', {
					sessionId,
				}),
			);
		}

		return Promise.resolve(clone(session));
	}

	performAction(request: ActionExecuteRequest): Promise<ActionExecuteResponse> {
		const response = this.#consumeAction();

		if (this.#isSuccess(response)) {
			const current = this.#sessions.get(request.sessionId);
			const registries = current
				? clone(current.registries)
				: clone({
						actions: {},
						buildings: {},
						developments: {},
						populations: {},
						resources: {},
					});
			this.#sessions.set(request.sessionId, {
				sessionId: request.sessionId,
				snapshot: clone(response.snapshot),
				registries,
			});
		}

		return Promise.resolve(clone(response));
	}

	advancePhase(
		request: SessionAdvanceRequest,
	): Promise<SessionAdvanceResponse> {
		const response = this.#consumeAdvance();

		this.#sessions.set(request.sessionId, {
			sessionId: response.sessionId,
			snapshot: clone(response.snapshot),
			registries: clone(response.registries),
		});

		return Promise.resolve(clone(response));
	}

	#consumeCreate(): SessionCreateResponse {
		const response = this.#nextCreate;

		if (response === undefined) {
			throw new Error('No create session response primed.');
		}

		this.#nextCreate = undefined;
		return response;
	}

	#consumeAdvance(): SessionAdvanceResponse {
		const response = this.#nextAdvance;

		if (response === undefined) {
			throw new Error('No advance response primed.');
		}

		this.#nextAdvance = undefined;
		return response;
	}

	#consumeAction(): ActionExecuteResponse {
		const response = this.#nextAction;

		if (response === undefined) {
			throw new Error('No action response primed.');
		}

		this.#nextAction = undefined;
		return response;
	}

	#isSuccess(
		response: ActionExecuteResponse,
	): response is ActionExecuteSuccessResponse {
		return response.status === 'success';
	}
}
