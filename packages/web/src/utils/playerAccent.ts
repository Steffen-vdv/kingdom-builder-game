type PlayerIdentity = { id: string };

type PlayerAccentKey = 'primary' | 'secondary' | 'neutral';

function resolvePlayerAccentKey(
	players: readonly PlayerIdentity[],
	playerId: string | null | undefined,
): PlayerAccentKey {
	if (!playerId) {
		return 'neutral';
	}
	const index = players.findIndex((player) => player.id === playerId);
	if (index === 0) {
		return 'primary';
	}
	if (index === 1) {
		return 'secondary';
	}
	return 'neutral';
}

export type { PlayerAccentKey };
export { resolvePlayerAccentKey };
