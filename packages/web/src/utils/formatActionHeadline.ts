interface FormatActionHeadlineOptions {
	prefix?: string;
	categoryIcon?: string;
	categoryTitle?: string;
	actionIcon?: string;
	actionTitle?: string;
}

function normalizePart(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildSegment(icon: string | undefined, title: string | undefined) {
	const normalizedIcon = normalizePart(icon);
	const normalizedTitle = normalizePart(title);
	const parts: string[] = [];
	if (normalizedIcon) {
		parts.push(normalizedIcon);
	}
	if (normalizedTitle) {
		parts.push(normalizedTitle);
	}
	if (parts.length === 0) {
		return undefined;
	}
	return parts.join(' ');
}

export function formatActionHeadline(
	options: FormatActionHeadlineOptions,
): string {
	const prefix = normalizePart(options.prefix) ?? 'Action';
	const segments: string[] = [prefix];
	const categorySegment = buildSegment(
		options.categoryIcon,
		options.categoryTitle,
	);
	if (categorySegment) {
		segments.push('-', categorySegment);
	}
	const actionSegment = buildSegment(options.actionIcon, options.actionTitle);
	if (actionSegment) {
		segments.push('-', actionSegment);
	}
	return segments
		.join(' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

export type { FormatActionHeadlineOptions };
