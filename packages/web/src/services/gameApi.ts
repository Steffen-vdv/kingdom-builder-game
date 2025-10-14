import type { GameApi, GameApiClientOptions } from './gameApi.types';
import { createHttpGameApi } from './gameApi.http';

export type {
	GameApi,
	GameApiClientOptions,
	GameApiRequestOptions,
	FetchFn,
	AuthTokenProvider,
} from './gameApi.types';
export { GameApiError } from './gameApi.types';

export const createGameApi = (options: GameApiClientOptions = {}): GameApi =>
	createHttpGameApi(options);

export type { GameApiMockHandlers, GameApiFakeState } from './gameApi.mocks';
export { createGameApiMock, GameApiFake } from './gameApi.mocks';
