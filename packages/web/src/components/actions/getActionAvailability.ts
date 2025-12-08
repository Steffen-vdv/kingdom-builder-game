import { splitActionCostMap } from './utils';
import type { Summary } from '../../translation';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import type { SessionActionRequirementList } from '@kingdom-builder/protocol/session';
import type { DisplayPlayer } from './types';

export interface ActionAvailabilityResult {
	costs: Record<string, number>;
	cleanup: Record<string, number>;
	costsReady: boolean;
	requirementsReady: boolean;
	groupsReady: boolean;
	metadataReady: boolean;
	requirementFailures: SessionActionRequirementList;
	canPay: boolean;
	meetsRequirements: boolean;
	implemented: boolean;
	performable: boolean;
	hasCleanupCosts: boolean;
}

interface ActionAvailabilityOptions {
	metadata: UseActionMetadataResult;
	player: DisplayPlayer;
	canInteract: boolean;
	summary: Summary | undefined;
}

export function getActionAvailability({
	metadata,
	player,
	canInteract,
	summary,
}: ActionAvailabilityOptions): ActionAvailabilityResult {
	const { costs, cleanup } = splitActionCostMap(metadata.costs);
	const costsReady = !metadata.loading.costs;
	const requirementsReady = !metadata.loading.requirements;
	const groupsReady = !metadata.loading.groups;
	const requirementFailures = metadata.requirements ?? [];
	const canPay = costsReady
		? Object.entries(costs).every(([resourceKey, cost]) => {
				const playerAmount = Number(player.values[resourceKey] ?? 0);
				const neededAmount = Number(cost ?? 0);
				return Number.isFinite(playerAmount) && Number.isFinite(neededAmount)
					? playerAmount >= neededAmount
					: false;
			})
		: false;
	const meetsRequirements =
		requirementsReady && requirementFailures.length === 0;
	const implemented = (summary?.length ?? 0) > 0;
	const metadataReady = costsReady && requirementsReady && groupsReady;
	const performable = [
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
		metadataReady,
		requirementFailures,
		canPay,
		meetsRequirements,
		implemented,
		performable,
		hasCleanupCosts: Object.keys(cleanup).length > 0,
	};
}
