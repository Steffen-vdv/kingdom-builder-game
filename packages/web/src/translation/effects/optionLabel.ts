import type { ActionEffectGroupOption } from '@kingdom-builder/protocol';
import type { SummaryEntry } from '../content';
import type { TranslationContext } from '../context';

type ObjectSummaryEntry = Extract<SummaryEntry, Record<string, unknown>>;

type MaybeDefinition =
	| { icon?: string | undefined; name?: string | undefined }
	| undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function resolveOptionTargetLabel(
	option: ActionEffectGroupOption,
	context: TranslationContext,
): string | undefined {
	const params = option.params;
	let targetId: string | undefined;
	if (isRecord(params)) {
		if (typeof params.id === 'string') {
			targetId = params.id;
		} else if (typeof params.developmentId === 'string') {
			targetId = params.developmentId;
		}
	}
	if (!targetId) {
		return undefined;
	}
	const resolveLabel = (definition: MaybeDefinition): string | undefined => {
		if (!definition) {
			return undefined;
		}
		const icon = typeof definition.icon === 'string' ? definition.icon : '';
		const name = definition.name ?? targetId;
		const combined = [icon, name].filter(Boolean).join(' ').trim();
		return combined.length > 0 ? combined : undefined;
	};
	try {
		const development = context.developments.get(targetId);
		const label = resolveLabel(development);
		if (label) {
			return label;
		}
	} catch {
		/* ignore missing development definitions */
	}
	try {
		const building = context.buildings.get(targetId) as MaybeDefinition;
		const label = resolveLabel(building);
		if (label) {
			return label;
		}
	} catch {
		/* ignore missing building definitions */
	}
	return undefined;
}

function normalizeEntryLabel(
	label: string,
	targetLabel: string | undefined,
): string {
	if (!targetLabel) {
		return label.trim();
	}
	const normalizedTarget = targetLabel.trim();
	const trimmedLabel = label.trim();
	if (trimmedLabel.length === 0) {
		return normalizedTarget;
	}
	if (normalizedTarget.startsWith(trimmedLabel)) {
		return normalizedTarget;
	}
	if (trimmedLabel.startsWith('Add ')) {
		const withoutAdd = trimmedLabel.slice(4).trim();
		if (normalizedTarget.startsWith(withoutAdd)) {
			return normalizedTarget;
		}
	}
	const firstSpace = trimmedLabel.indexOf(' ');
	if (firstSpace > 0) {
		const withoutVerb = trimmedLabel.slice(firstSpace + 1).trim();
		if (withoutVerb.length > 0 && normalizedTarget.startsWith(withoutVerb)) {
			return normalizedTarget;
		}
	}
	return trimmedLabel;
}

function cloneSummaryEntry(entry: SummaryEntry): SummaryEntry {
	if (typeof entry === 'string') {
		return entry;
	}
	const { items, ...rest } = entry;
	return {
		...rest,
		items: (items ?? []).map(cloneSummaryEntry),
	} as ObjectSummaryEntry;
}

function fallbackOptionLabel(option: ActionEffectGroupOption): string {
	const base = [option.icon, option.label].filter(Boolean).join(' ').trim();
	return base.length > 0 ? base : option.id;
}

function resolveActionLabel(
	option: ActionEffectGroupOption,
	context: TranslationContext,
): string {
	try {
		const definition = context.actions.get(option.actionId);
		const icon = typeof definition?.icon === 'string' ? definition.icon : '';
		const name =
			typeof definition?.name === 'string' ? definition.name : option.actionId;
		const combined = [icon, name].filter(Boolean).join(' ').trim();
		return combined.length > 0 ? combined : option.actionId;
	} catch {
		return option.actionId;
	}
}

function combineLabels(
	actionLabel: string,
	entryLabel: string | undefined,
	fallback: string,
): string {
	const base = actionLabel.trim();
	const entry = (entryLabel ?? '').trim();
	if (entry.length > 0) {
		if (base.length > 0 && entry.startsWith(base)) {
			return entry;
		}
		if (base.length > 0) {
			return `${base} - ${entry}`;
		}
		return entry;
	}
	if (base.length > 0) {
		return base;
	}
	return fallback;
}

export interface ActionOptionTranslationResult {
	label: string;
	entry: SummaryEntry;
}

type EffectGroupMode = 'summarize' | 'describe' | 'log';

export function buildActionOptionTranslation(
	option: ActionEffectGroupOption,
	context: TranslationContext,
	translated: SummaryEntry[],
	mode: EffectGroupMode,
): ActionOptionTranslationResult {
	const fallback = fallbackOptionLabel(option);
	const actionLabel = resolveActionLabel(option, context) || fallback;
	const targetLabel = resolveOptionTargetLabel(option, context);
	if (translated.length === 0) {
		return { label: actionLabel, entry: actionLabel };
	}
	const first = translated[0];
	if (typeof first === 'undefined') {
		return { label: actionLabel, entry: actionLabel };
	}
	const restEntries = translated.slice(1).map(cloneSummaryEntry);
	if (typeof first === 'string') {
		let firstEntry = first;
		if (mode === 'log') {
			const actionPrefix = `${actionLabel} - `;
			if (firstEntry.startsWith(actionPrefix)) {
				firstEntry = firstEntry.slice(actionPrefix.length);
			}
		}
		const normalizedFirst = normalizeEntryLabel(firstEntry, targetLabel);
		const title = combineLabels(actionLabel, normalizedFirst, fallback);
		const shouldIncludeFirstDetail =
			restEntries.length > 0
				? true
				: mode === 'describe' && normalizedFirst !== targetLabel;
		const detailEntries =
			restEntries.length > 0
				? restEntries
				: shouldIncludeFirstDetail
					? [normalizedFirst]
					: [];
		if (detailEntries.length === 0) {
			return { label: title, entry: title };
		}
		return { label: title, entry: { title, items: detailEntries } };
	}
	const firstObject = cloneSummaryEntry(first) as ObjectSummaryEntry;
	const normalizedTitle = normalizeEntryLabel(firstObject.title, targetLabel);
	const combinedTitle = combineLabels(actionLabel, normalizedTitle, fallback);
	const entry: ObjectSummaryEntry = {
		...firstObject,
		title: combinedTitle,
		items: [...(firstObject.items ?? []), ...restEntries],
	};
	return { label: combinedTitle, entry };
}

export function deriveActionOptionLabel(
	option: ActionEffectGroupOption,
	context: TranslationContext,
	translated: SummaryEntry[],
): string {
	return buildActionOptionTranslation(option, context, translated, 'summarize')
		.label;
}
