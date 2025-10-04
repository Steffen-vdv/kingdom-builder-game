import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { type PassiveSummary } from '@kingdom-builder/engine';

interface PassiveLogDetails {
	icon: string;
	label: string;
	removal?: string;
}

function pickFirstLabelCandidate(values: Array<string | undefined>): string {
	for (const value of values) {
		if (value && value.trim().length > 0) {
			return value.trim();
		}
	}
	return '';
}

function describeRemoval(meta: PassiveSummary['meta']): string | undefined {
	const removalText = meta?.removal?.text;
	if (removalText && removalText.trim().length > 0) {
		return removalText;
	}
	const removalToken = meta?.removal?.token;
	if (removalToken && removalToken.trim().length > 0) {
		return `Removed when ${removalToken}`;
	}
	return undefined;
}

export function resolvePassiveLogDetails(
	passive: PassiveSummary,
): PassiveLogDetails {
	const icon =
		passive.meta?.source?.icon ?? passive.icon ?? PASSIVE_INFO.icon ?? '';
	const label =
		pickFirstLabelCandidate([
			passive.meta?.source?.labelToken,
			passive.detail,
			passive.name,
			passive.id,
		]) || passive.id;
	const removal = describeRemoval(passive.meta);
	const details: PassiveLogDetails = { icon, label };
	if (removal) {
		details.removal = removal;
	}
	return details;
}
