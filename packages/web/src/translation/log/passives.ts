import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { type PassiveSummary } from '@kingdom-builder/engine';

interface PassiveLogDetails {
	icon: string;
	label: string;
	removal?: string;
}

function firstNonEmptyString(...values: Array<unknown>): string | undefined {
	for (const value of values) {
		if (typeof value !== 'string') {
			continue;
		}
		const trimmed = value.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}
	return undefined;
}

function getMetaString(meta: unknown, key: string): string | undefined {
	if (typeof meta !== 'object' || meta === null) {
		return undefined;
	}
	const value = (meta as Record<string, unknown>)[key];
	return typeof value === 'string' ? value : undefined;
}

function describeRemoval(meta: PassiveSummary['meta']): string | undefined {
	const removal = firstNonEmptyString(
		getMetaString(meta?.removal, 'text'),
		getMetaString(meta?.removal, 'label'),
	);
	if (removal) {
		return removal;
	}
	const removalToken = getMetaString(meta?.removal, 'token');
	if (removalToken) {
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
		firstNonEmptyString(
			getMetaString(passive.meta?.source, 'label'),
			getMetaString(passive.meta?.source, 'labelToken'),
			getMetaString(passive.meta, 'label'),
			passive.detail,
			passive.name,
			passive.id,
		) ?? passive.id;
	const removal = describeRemoval(passive.meta);
	const details: PassiveLogDetails = { icon, label };
	if (removal) {
		details.removal = removal;
	}
	return details;
}
