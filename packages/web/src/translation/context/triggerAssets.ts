import type {
	SessionPhaseMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';
import type { TranslationTriggerAsset } from './types';

const FALLBACK_TRIGGER_ICON = '🔔';

const STATIC_TRIGGER_FALLBACKS = Object.freeze([
	[
		'onBuild',
		Object.freeze({
			icon: '⚒️',
			future: 'Until removed',
			past: 'Build',
		}),
	],
	[
		'onBeforeAttacked',
		Object.freeze({
			icon: '🛡️',
			future: 'Before being attacked',
			past: 'Before attack',
		}),
	],
	[
		'onAttackResolved',
		Object.freeze({
			icon: '⚔️',
			future: 'After being attacked',
			past: 'After attack',
		}),
	],
	[
		'onPayUpkeepStep',
		Object.freeze({
			icon: '🧹',
			future: 'During Upkeep Phase — Pay Upkeep step',
			past: 'Upkeep Phase — Pay Upkeep step',
		}),
	],
	[
		'onGainIncomeStep',
		Object.freeze({
			icon: '💰',
			future: 'During Growth Phase — Gain Income step',
			past: 'Growth Phase — Gain Income step',
		}),
	],
	[
		'onGainAPStep',
		Object.freeze({
			icon: '⚡',
			future: 'During action point step',
			past: 'Action point step',
		}),
	],
	[
		'mainPhase',
		Object.freeze({
			icon: '🎯',
			past: 'Main phase',
		}),
	],
]) satisfies ReadonlyArray<readonly [string, SessionTriggerMetadata]>;

function toTitleCase(value: string): string {
	return value
		.split(/[^a-zA-Z0-9]+/u)
		.filter((part) => part.length > 0)
		.map((part) => {
			const first = part.charAt(0).toUpperCase();
			return `${first}${part.slice(1)}`;
		})
		.join(' ');
}

export function createTriggerFallback(
	triggerId: string,
): TranslationTriggerAsset {
	const cleanId = triggerId.startsWith('on')
		? triggerId.slice('on'.length)
		: triggerId;
	const readable = toTitleCase(cleanId.replace(/Step$/u, ''));
	const past = readable.length ? readable : triggerId;
	const entry: TranslationTriggerAsset = {
		icon: FALLBACK_TRIGGER_ICON,
		past,
		label: past,
	};
	if (readable.length) {
		entry.future = `On ${readable}`;
	}
	return Object.freeze(entry);
}

export function mergeTriggerAsset(
	base: TranslationTriggerAsset | undefined,
	descriptor: SessionTriggerMetadata | undefined,
): TranslationTriggerAsset {
	const entry: TranslationTriggerAsset = {};
	const icon = descriptor?.icon ?? base?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const future = descriptor?.future ?? base?.future;
	if (future !== undefined) {
		entry.future = future;
	}
	const past = descriptor?.past ?? base?.past;
	if (past !== undefined) {
		entry.past = past;
	}
	const label = descriptor?.label ?? base?.label ?? past;
	if (label !== undefined) {
		entry.label = label;
	}
	return Object.freeze(entry);
}

function buildPhaseTriggerFallbacks(
	phases?: Record<string, SessionPhaseMetadata> | undefined,
): Record<string, SessionTriggerMetadata> {
	if (!phases) {
		return {};
	}
	const entries: Record<string, SessionTriggerMetadata> = {};
	for (const [phaseId, descriptor] of Object.entries(phases)) {
		const cleaned = phaseId.startsWith('phase.')
			? phaseId.slice('phase.'.length)
			: phaseId;
		const capitalized = cleaned
			? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}`
			: '';
		const key = cleaned ? `on${capitalized}Phase` : 'onPhasePhase';
		const labelSource = descriptor.label?.trim() ?? toTitleCase(cleaned);
		const normalizedLabel = labelSource.endsWith('Phase')
			? labelSource
			: `${labelSource} Phase`;
		const metadata: SessionTriggerMetadata = {
			future: `On each ${normalizedLabel}`,
			past: normalizedLabel,
		};
		if (descriptor.icon !== undefined) {
			metadata.icon = descriptor.icon;
		}
		entries[key] = Object.freeze(metadata);
	}
	return entries;
}

export function buildTriggerAssetMap(
	triggers?: Record<string, SessionTriggerMetadata> | undefined,
	phases?: Record<string, SessionPhaseMetadata> | undefined,
): Readonly<Record<string, TranslationTriggerAsset>> {
	const staticDescriptors = Object.fromEntries(
		STATIC_TRIGGER_FALLBACKS,
	) as Record<string, SessionTriggerMetadata>;
	const fallbackDescriptors: Record<string, SessionTriggerMetadata> = {
		...staticDescriptors,
		...buildPhaseTriggerFallbacks(phases),
	};
	const entries: Record<string, TranslationTriggerAsset> = {};
	for (const [id, descriptor] of Object.entries(fallbackDescriptors)) {
		entries[id] = mergeTriggerAsset(undefined, descriptor);
	}
	if (triggers) {
		for (const [id, descriptor] of Object.entries(triggers)) {
			const base = entries[id] ?? createTriggerFallback(id);
			entries[id] = mergeTriggerAsset(base, descriptor);
		}
	}
	return Object.freeze(entries);
}
