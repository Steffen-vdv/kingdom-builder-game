import type { Summary } from '../../translation';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import type { DisplayPlayer } from './types';
import { splitActionCostMap } from './utils';

export interface ActionAvailabilityResult {
	costs: Record<string, number>;
	cleanup: Record<string, number>;
	costsReady: boolean;
	requirementsReady: boolean;
	groupsReady: boolean;
	implemented: boolean;
	canPay: boolean;
	meetsRequirements: boolean;
	metadataReady: boolean;
	isPerformable: boolean;
}

export interface ActionAvailabilityOptions {
	metadata: UseActionMetadataResult;
	summary: Summary | undefined;
	player: DisplayPlayer;
	canInteract: boolean;
}

export const EMPTY_ACTION_METADATA: UseActionMetadataResult = {
	costs: undefined,
	requirements: undefined,
	groups: undefined,
	loading: {
		costs: true,
		requirements: true,
		groups: true,
	},
};

export function getActionAvailability({
	metadata,
	summary,
	player,
	canInteract,
}: ActionAvailabilityOptions): ActionAvailabilityResult {
	const { costs, cleanup } = splitActionCostMap(metadata.costs);
	const costsReady = !metadata.loading.costs;
	const requirementsReady = !metadata.loading.requirements;
	const groupsReady = !metadata.loading.groups;
	const implemented = (summary?.length ?? 0) > 0;
	const requirementFailures = metadata.requirements ?? [];
	const canPay = costsReady
		? Object.entries(costs).every(([resourceKey, cost]) => {
				const available = Number(player.resources[resourceKey] ?? 0);
				if (!Number.isFinite(available)) {
					return false;
				}
				return available >= Number(cost ?? 0);
			})
		: false;
	const meetsRequirements =
		requirementsReady && requirementFailures.length === 0;
	const metadataReady = costsReady && requirementsReady && groupsReady;
	const isPerformable = [
		metadataReady,
		canPay,
		meetsRequirements,
		canInteract,
		implemented,
	].every(Boolean);
	return {
		costs,
		cleanup,
		costsReady,
		requirementsReady,
		groupsReady,
		implemented,
		canPay,
		meetsRequirements,
		metadataReady,
		isPerformable,
	};
}
