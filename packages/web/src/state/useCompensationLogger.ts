import { useEffect } from 'react';
import type { EngineContext } from '@kingdom-builder/engine';
import type { ResourceKey } from '@kingdom-builder/contents';
import {
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
} from '../translation';

interface UseCompensationLoggerOptions {
	ctx: EngineContext;
	addLog: (
		entry: string | string[],
		player?: EngineContext['activePlayer'],
	) => void;
	resourceKeys: ResourceKey[];
}

export function useCompensationLogger({
	ctx,
	addLog,
	resourceKeys,
}: UseCompensationLoggerOptions) {
	useEffect(() => {
		ctx.game.players.forEach((player) => {
			const compensation = ctx.compensations[player.id];
			if (
				!compensation ||
				(Object.keys(compensation.resources || {}).length === 0 &&
					Object.keys(compensation.stats || {}).length === 0)
			) {
				return;
			}
			const after: PlayerSnapshot = snapshotPlayer(player, ctx);
			const before: PlayerSnapshot = {
				...after,
				resources: { ...after.resources },
				stats: { ...after.stats },
				buildings: [...after.buildings],
				lands: after.lands.map((land) => ({
					...land,
					developments: [...land.developments],
				})),
				passives: [...after.passives],
			};
			for (const [resourceKey, resourceDelta] of Object.entries(
				compensation.resources || {},
			)) {
				before.resources[resourceKey] =
					(before.resources[resourceKey] || 0) - (resourceDelta ?? 0);
			}
			for (const [statKey, statDelta] of Object.entries(
				compensation.stats || {},
			)) {
				before.stats[statKey] = (before.stats[statKey] || 0) - (statDelta ?? 0);
			}
			const lines = diffStepSnapshots(
				before,
				after,
				undefined,
				ctx,
				resourceKeys,
			);
			if (lines.length) {
				addLog(
					['Last-player compensation:', ...lines.map((line) => `  ${line}`)],
					player,
				);
			}
		});
	}, [addLog, ctx, resourceKeys]);
}
