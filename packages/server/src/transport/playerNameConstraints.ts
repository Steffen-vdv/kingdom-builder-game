export const PLAYER_NAME_MAX_LENGTH = 40;

export function clipPlayerName(name: string): string {
	return name.slice(0, PLAYER_NAME_MAX_LENGTH);
}
