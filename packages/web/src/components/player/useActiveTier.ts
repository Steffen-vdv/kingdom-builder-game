import { useMemo } from 'react';
import type { SessionPlayerStateSnapshot } from '@kingdom-builder/protocol';
import type { TierDefinition } from './buildTierEntries';

interface ActiveTierResult {
	tierByPassiveId: Map<string, TierDefinition>;
	activeTierId: string | undefined;
}

/**
 * Custom hook to determine the active tier for a player based on their passives
 * and resource values.
 */
export function useActiveTier(
	player: SessionPlayerStateSnapshot,
	tierDefinitions: readonly TierDefinition[],
	tieredResourceKey: string | undefined,
): ActiveTierResult {
	// Map tier passive IDs to tier definitions for authoritative tier detection
	const tierByPassiveId = useMemo(
		() =>
			tierDefinitions.reduce<Map<string, TierDefinition>>((map, tier) => {
				const passiveId = tier.preview?.id;
				if (passiveId) {
					map.set(passiveId, tier);
				}
				return map;
			}, new Map()),
		[tierDefinitions],
	);

	// Find the active tier
	const activeTierId = useMemo(() => {
		for (const passive of player.passives) {
			const tier = tierByPassiveId.get(passive.id);
			if (tier) {
				return tier.id;
			}
		}
		if (!tieredResourceKey) {
			return undefined;
		}
		const value = player.values?.[tieredResourceKey] ?? 0;
		for (const tier of tierDefinitions) {
			const min = tier.range.min ?? 0;
			const max = tier.range.max;
			if (value >= min && (max === undefined || value <= max)) {
				return tier.id;
			}
		}
		return undefined;
	}, [
		player.passives,
		tierByPassiveId,
		tieredResourceKey,
		tierDefinitions,
		player.values,
	]);

	return { tierByPassiveId, activeTierId };
}
