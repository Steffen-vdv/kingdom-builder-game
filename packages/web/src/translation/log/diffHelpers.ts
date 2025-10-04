import {
	type EffectDef,
	type EngineContext,
	type PassiveSummary,
} from '@kingdom-builder/engine';
import { LAND_INFO, SLOT_INFO, PASSIVE_INFO } from '@kingdom-builder/contents';

import { logContent } from '../content';
import { type PlayerSnapshot } from './playerSnapshot';
import { type StepDef } from './metaIcons';

export function findStatPctBreakdown(
	step: StepDef | undefined,
	statKey: string,
): { role: string; percentStat: string } | undefined {
	const walk = (
		effects: EffectDef[] | undefined,
		currentRole: string | undefined,
	): { role: string; percentStat: string } | undefined => {
		if (!effects) {
			return undefined;
		}
		for (const effect of effects) {
			let role = currentRole;
			if (effect.evaluator?.type === 'population') {
				const evaluatorParams: Record<string, unknown> | undefined =
					effect.evaluator.params;
				const roleParam = evaluatorParams?.['role'];
				if (typeof roleParam === 'string') {
					role = roleParam;
				}
			}
			if (effect.type === 'stat' && effect.method === 'add_pct') {
				const params = effect.params;
				const keyParam = params?.['key'];
				const percentParam = params?.['percentStat'];
				if (
					typeof keyParam === 'string' &&
					keyParam === statKey &&
					typeof percentParam === 'string' &&
					typeof role === 'string'
				) {
					return {
						role,
						percentStat: percentParam,
					};
				}
			}
			const nested = walk(effect.effects, role);
			if (nested) {
				return nested;
			}
		}
		return undefined;
	};
	return walk(step?.effects, undefined);
}

export function resolvePassiveLogDetails(passive: PassiveSummary) {
	const icon =
		passive.meta?.source?.icon ?? passive.icon ?? PASSIVE_INFO.icon ?? '';
	const labelCandidates = [
		passive.meta?.source?.labelToken,
		passive.detail,
		passive.name,
		passive.id,
	];
	const resolvedLabel = labelCandidates
		.map((candidate) => candidate?.trim())
		.find((candidate) => candidate && candidate.length > 0);
	const label = resolvedLabel ?? passive.id;
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

export function appendStructureChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	context: EngineContext,
): void {
	const landIcon = LAND_INFO.icon;
	const landLabel = LAND_INFO.label;
	const beforeBuildings = new Set(before.buildings);
	const afterBuildings = new Set(after.buildings);
	for (const id of afterBuildings) {
		if (!beforeBuildings.has(id)) {
			const label = logContent('building', id, context)[0] ?? id;
			changes.push(`${label} built`);
		}
	}
	for (const land of after.lands) {
		const previous = before.lands.find(
			(entry: PlayerSnapshot['lands'][number]) => entry.id === land.id,
		);
		if (!previous) {
			const newLandSummary = `${landIcon} +1 ${landLabel}`;
			changes.push(newLandSummary);
			continue;
		}
		for (const development of land.developments) {
			if (!previous.developments.includes(development)) {
				const developmentTokens = logContent(
					'development',
					development,
					context,
				);
				const label = developmentTokens[0] ?? development;
				const developmentSummary = `${landIcon} +${label}`;
				changes.push(developmentSummary);
			}
		}
	}
	let beforeSlots = 0;
	for (const land of before.lands) {
		beforeSlots += land.slotsMax;
	}
	let afterSlots = 0;
	for (const land of after.lands) {
		afterSlots += land.slotsMax;
	}
	let newLandSlots = 0;
	for (const land of after.lands) {
		let existed = false;
		for (const previous of before.lands) {
			if (previous.id === land.id) {
				existed = true;
				break;
			}
		}
		if (existed) {
			continue;
		}
		newLandSlots += land.slotsMax;
	}
	const slotDelta = afterSlots - newLandSlots - beforeSlots;
	if (slotDelta !== 0) {
		const slotSign = slotDelta >= 0 ? '+' : '';
		const slotRange = `${beforeSlots}→${beforeSlots + slotDelta}`;
		const slotParts = [
			SLOT_INFO.icon,
			SLOT_INFO.label,
			`${slotSign}${slotDelta}`,
			`(${slotRange})`,
		];
		changes.push(slotParts.join(' '));
	}
	const beforePassiveMap = new Map<string, PassiveSummary>();
	for (const passive of before.passives) {
		beforePassiveMap.set(passive.id, passive);
	}
	const afterPassiveMap = new Map<string, PassiveSummary>();
	for (const passive of after.passives) {
		afterPassiveMap.set(passive.id, passive);
	}
	for (const [id, passive] of afterPassiveMap) {
		if (beforePassiveMap.has(id)) {
			continue;
		}
		const { icon, label, removal } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		const suffix = removal ? ` (${removal})` : '';
		const activationMessage = `${label} activated${suffix}`;
		const activationSummary = `${prefix}${activationMessage}`;
		changes.push(activationSummary);
	}
	for (const [id, passive] of beforePassiveMap) {
		if (afterPassiveMap.has(id)) {
			continue;
		}
		const { icon, label } = resolvePassiveLogDetails(passive);
		const prefix = icon ? `${icon} ` : '';
		const expirationMessage = `${label} expired`;
		const expirationSummary = `${prefix}${expirationMessage}`;
		changes.push(expirationSummary);
	}
}
