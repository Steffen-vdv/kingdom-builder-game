import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol/session';
import type { ActionResolution } from './useActionResolution.types';

type ResolutionSetter = (
	updater: (previous: ActionResolution | null) => ActionResolution | null,
) => void;

export function createResolutionPlayerSynchronizer(
	setResolution: ResolutionSetter,
) {
	return (players: Array<Pick<SessionPlayerStateSnapshot, 'id' | 'name'>>) => {
		if (!players.length) {
			return;
		}
		const nameById = new Map(
			players.map((player) => [player.id, (player.name ?? '').trim()]),
		);
		setResolution((previous) => {
			if (!previous) {
				return previous;
			}
			const currentPlayer = previous.player;
			if (!currentPlayer?.id) {
				return previous;
			}
			const stored = nameById.get(currentPlayer.id);
			if (stored === undefined) {
				return previous;
			}
			const nextName = stored.length > 0 ? stored : currentPlayer.id;
			if (currentPlayer.name === nextName) {
				return previous;
			}
			return {
				...previous,
				player: { ...currentPlayer, id: currentPlayer.id, name: nextName },
			};
		});
	};
}
