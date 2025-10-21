import type { Summary, TranslationContext } from '../../translation';
import {
	describeContent,
	splitSummary,
	summarizeContent,
} from '../../translation';

type ContentTarget = { type: 'development' | 'building'; id: string };

interface ContentDetails {
	summary?: Summary;
	describeEffects?: Summary;
	description?: Summary;
}

function flattenSummary(summary: Summary | undefined): string[] {
	if (!summary) {
		return [];
	}
	const lines: string[] = [];
	for (const entry of summary) {
		if (typeof entry === 'string') {
			const text = entry.trim();
			if (text.length > 0) {
				lines.push(text);
			}
			continue;
		}
		const { title, items } = entry;
		if (typeof title === 'string') {
			const text = title.trim();
			if (text.length > 0) {
				lines.push(text);
			}
		}
		if (Array.isArray(items)) {
			lines.push(...flattenSummary(items));
		}
	}
	return lines;
}

function safeHas(
	registry:
		| TranslationContext['buildings']
		| TranslationContext['developments'],
	id: string,
): boolean {
	try {
		return registry.has(id);
	} catch {
		return false;
	}
}

export function resolveContentTarget(
	translationContext: TranslationContext,
	params: Record<string, unknown>,
): ContentTarget | undefined {
	const developmentId =
		typeof params.developmentId === 'string' ? params.developmentId : undefined;
	if (
		developmentId &&
		safeHas(translationContext.developments, developmentId)
	) {
		return { type: 'development', id: developmentId };
	}
	const genericId = typeof params.id === 'string' ? params.id : undefined;
	if (!genericId) {
		return undefined;
	}
	if (safeHas(translationContext.developments, genericId)) {
		return { type: 'development', id: genericId };
	}
	if (safeHas(translationContext.buildings, genericId)) {
		return { type: 'building', id: genericId };
	}
	return undefined;
}

export function resolveContentDetails(
	translationContext: TranslationContext,
	target: ContentTarget | undefined,
): ContentDetails | undefined {
	if (!target) {
		return undefined;
	}
	try {
		const summary = summarizeContent(
			target.type,
			target.id,
			translationContext,
		);
		const described = describeContent(
			target.type,
			target.id,
			translationContext,
		);
		const { effects: describeEffects, description } = splitSummary(described);
		return { summary, describeEffects, description };
	} catch {
		return undefined;
	}
}

export function extractPrimaryLine(
	summary: Summary | undefined,
): string | undefined {
	const [first] = flattenSummary(summary);
	return first;
}

export function extractParagraph(
	summary: Summary | undefined,
): string | undefined {
	const lines = flattenSummary(summary);
	if (lines.length === 0) {
		return undefined;
	}
	return lines.join(' ');
}
