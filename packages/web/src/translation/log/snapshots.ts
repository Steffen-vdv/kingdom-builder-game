import {
	RESOURCES,
	STATS,
	LAND_INFO,
	SLOT_INFO,
	PASSIVE_INFO,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	type EngineContext,
	type PassiveSummary,
	type PlayerId,
} from '@kingdom-builder/engine';
import { logContent, type Land } from '../content';
import { statDisplaysAsPercent } from '../../utils/stats';

export interface PlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: {
		id: string;
		slotsMax: number;
		slotsUsed: number;
		developments: string[];
	}[];
	passives: PassiveSummary[];
}

export function snapshotPlayer(
	playerState: {
		id: string;
		resources: Record<string, number>;
		stats: Record<string, number>;
		buildings: Set<string>;
		lands: Land[];
	},
	context: EngineContext,
): PlayerSnapshot {
	return {
		resources: { ...playerState.resources },
		stats: { ...playerState.stats },
		buildings: Array.from(playerState.buildings ?? []),
		lands: playerState.lands.map((playerLand) => ({
			id: playerLand.id,
			slotsMax: playerLand.slotsMax,
			slotsUsed: playerLand.slotsUsed,
			developments: [...playerLand.developments],
		})),
		passives: context.passives.list(playerState.id as PlayerId),
	};
}

function formatDelta(delta: number): string {
	return `${delta >= 0 ? '+' : ''}${delta}`;
}

export function diffSnapshots(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
	resourceKeys: ResourceKey[] = Object.keys({
		...before.resources,
		...after.resources,
	}) as ResourceKey[],
): string[] {
	const changes: string[] = [];

	for (const resourceKey of resourceKeys) {
		const beforeValue = before.resources[resourceKey] ?? 0;
		const afterValue = after.resources[resourceKey] ?? 0;
		if (afterValue !== beforeValue) {
			const info = RESOURCES[resourceKey];
			const iconPrefix = info?.icon ? `${info.icon} ` : '';
			const label = info?.label ?? resourceKey;
			const delta = afterValue - beforeValue;
			const changeText = [
				`${iconPrefix}${label}`,
				formatDelta(delta),
				`(${beforeValue}→${afterValue})`,
			].join(' ');
			changes.push(changeText);
		}
	}

	for (const statKey of Object.keys(after.stats)) {
		const beforeValue = before.stats[statKey] ?? 0;
		const afterValue = after.stats[statKey] ?? 0;
		if (afterValue !== beforeValue) {
			const statInfo = STATS[statKey as keyof typeof STATS];
			const iconOnly = statInfo?.icon ?? '';
			const iconPrefix = iconOnly ? `${iconOnly} ` : '';
			const label = statInfo?.label ?? statKey;
			const delta = afterValue - beforeValue;

			if (statDisplaysAsPercent(statKey)) {
				const beforePercent = beforeValue * 100;
				const afterPercent = afterValue * 100;
				const deltaPercent = delta * 100;
				const plusSign = deltaPercent >= 0 ? '+' : '';
				// prettier-ignore
				const deltaPercentText =
`${plusSign}${deltaPercent}%`;
				const changeText = [
					`${iconPrefix}${label}`,
					deltaPercentText,
					`(${beforePercent}→${afterPercent}%)`,
				].join(' ');
				changes.push(changeText);
			} else {
				const changeText = [
					`${iconPrefix}${label}`,
					formatDelta(delta),
					`(${beforeValue}→${afterValue})`,
				].join(' ');
				changes.push(changeText);
			}
		}
	}

	const previousBuildings = new Set(before.buildings);
	const currentBuildings = new Set(after.buildings);
	for (const buildingId of currentBuildings) {
		if (previousBuildings.has(buildingId)) {
			continue;
		}
		const buildingLog = logContent('building', buildingId, context);
		const label = buildingLog[0] ?? buildingId;
		changes.push(`${label} built`);
	}

	for (const land of after.lands) {
		const previousLand = before.lands.find(
			(candidate) => candidate.id === land.id,
		);
		if (!previousLand) {
			// prettier-ignore
			const changeText =
`${LAND_INFO.icon} +1 ${LAND_INFO.label}`;
			changes.push(changeText);
			continue;
		}
		for (const developmentId of land.developments) {
			if (previousLand.developments.includes(developmentId)) {
				continue;
			}
			// prettier-ignore
			const developmentLog = logContent(
'development',
developmentId,
context,
);
			const label = developmentLog[0] ?? developmentId;
			changes.push(`${LAND_INFO.icon} +${label}`);
		}
	}

	const previousSlots = before.lands.reduce(
		(sum, landState) => sum + landState.slotsMax,
		0,
	);
	const currentSlots = after.lands.reduce(
		(sum, landState) => sum + landState.slotsMax,
		0,
	);
	const newLandSlots = after.lands
		.filter((landState) => {
			const landExists = before.lands.some(
				(candidate) => candidate.id === landState.id,
			);
			return !landExists;
		})
		.reduce((sum, landState) => sum + landState.slotsMax, 0);
	const slotDelta = currentSlots - newLandSlots - previousSlots;
	if (slotDelta !== 0) {
		const changeText = [
			`${SLOT_INFO.icon} ${SLOT_INFO.label}`,
			formatDelta(slotDelta),
			`(${previousSlots}→${previousSlots + slotDelta})`,
		].join(' ');
		changes.push(changeText);
	}

	const previousPassives = new Map(
		before.passives.map((passive) => [passive.id, passive]),
	);
	const currentPassives = new Map(
		after.passives.map((passive) => [passive.id, passive]),
	);
	for (const [passiveId, passive] of currentPassives) {
		if (previousPassives.has(passiveId)) {
			continue;
		}
		const details = resolvePassiveLogDetails(passive);
		const { icon, label, removal } = details;
		const prefix = icon ? `${icon} ` : '';
		const suffix = removal ? ` (${removal})` : '';
		const activationText = `${prefix}${label} activated${suffix}`;
		changes.push(activationText);
	}
	for (const [passiveId, passive] of previousPassives) {
		if (currentPassives.has(passiveId)) {
			continue;
		}
		const { icon, label } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		const expirationText = `${prefix}${label} expired`;
		changes.push(expirationText);
	}

	return changes;
}
export function resolvePassiveLogDetails(passive: PassiveSummary) {
	// prettier-ignore
	const icon =
passive.meta?.source?.icon ??
passive.icon ??
PASSIVE_INFO.icon ??
'';
	// prettier-ignore
	const label =
[
passive.meta?.source?.labelToken,
passive.detail,
passive.name,
passive.id,
]
.map((candidate) => candidate?.trim())
.find(
(candidate) => candidate !== undefined && candidate.length > 0,
) ?? passive.id;
	let removal: string | undefined;
	const removalText = passive.meta?.removal?.text;
	if (removalText && removalText.trim().length > 0) {
		removal = removalText;
	} else {
		const removalToken = passive.meta?.removal?.token;
		if (removalToken && removalToken.trim().length > 0) {
			removal = `Removed when ${removalToken}`;
		}
	}
	return { icon, label, removal };
}
