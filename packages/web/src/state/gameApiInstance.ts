import { createGameApi, type GameApi } from '../services/gameApi';

let gameApi: GameApi | null = null;

export function ensureGameApi(): GameApi {
	if (!gameApi) {
		gameApi = createGameApi();
	}
	return gameApi;
}

export function setGameApi(instance: GameApi | null): void {
	gameApi = instance;
}
