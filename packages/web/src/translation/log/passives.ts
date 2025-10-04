import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { type PassiveSummary } from '@kingdom-builder/engine';
import {
	hasTierSummaryTranslation,
	translateTierSummary,
} from '../content/tierSummaries';

interface PassiveLogDetails {
	icon: string;
	label: string;
	removal?: string;
}

function normalizeLabel(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function resolveSummaryToken(value: string | undefined): string | undefined {
	const token = normalizeLabel(value);
	if (!token) {
		return undefined;
	}
	if (!hasTierSummaryTranslation(token)) {
		return undefined;
	}
	return translateTierSummary(token) ?? token;
}

function describeRemoval(meta: PassiveSummary['meta']): string | undefined {
	const removalText = meta?.removal?.text;
	if (removalText && removalText.trim().length > 0) {
		return removalText;
	}
	const removalToken = meta?.removal?.token;
	if (removalToken && removalToken.trim().length > 0) {
		return `Active as long as ${removalToken}`;
	}
	return undefined;
}

export function resolvePassiveLogDetails(
	passive: PassiveSummary,
): PassiveLogDetails {
	const icon =
		passive.meta?.source?.icon ?? passive.icon ?? PASSIVE_INFO.icon ?? '';
	const label =
		normalizeLabel(
			resolveSummaryToken(passive.meta?.source?.labelToken) ||
				resolveSummaryToken(passive.detail) ||
				normalizeLabel(passive.meta?.source?.labelToken) ||
				normalizeLabel(passive.detail) ||
				normalizeLabel(passive.name) ||
				normalizeLabel(passive.id),
		) || passive.id;
	const removal = describeRemoval(passive.meta);
	const details: PassiveLogDetails = { icon, label };
	if (removal) {
		details.removal = removal;
	}
	return details;
}
