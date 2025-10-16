import { createGameApi, type GameApi } from '../services/gameApi';
import { resolveAuthToken } from './authToken';

let gameApi: GameApi | null = null;

export function ensureGameApi(): GameApi {
	if (!gameApi) {
		gameApi = createGameApi({
			getAuthToken: resolveAuthToken,
		});
	}
	return gameApi;
}

export function setGameApi(instance: GameApi | null): void {
	gameApi = instance;
}
