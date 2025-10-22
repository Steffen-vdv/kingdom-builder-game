interface FormatActionTitleOptions {
	categoryIcon?: string;
	categoryTitle?: string;
	actionIcon?: string;
	actionTitle: string;
	prefix?: string;
}

function combineIconTitle(icon?: string, title?: string): string {
	const trimmedIcon = icon?.trim() ?? '';
	const trimmedTitle = title?.trim() ?? '';
	if (trimmedIcon && trimmedTitle) {
		return `${trimmedIcon} ${trimmedTitle}`.trim();
	}
	if (trimmedIcon) {
		return trimmedIcon;
	}
	if (trimmedTitle) {
		return trimmedTitle;
	}
	return '';
}

export function formatActionTitle({
	categoryIcon,
	categoryTitle,
	actionIcon,
	actionTitle,
	prefix,
}: FormatActionTitleOptions): string {
	const normalizedPrefix = prefix?.trim() || 'Action';
	const categorySegment = combineIconTitle(categoryIcon, categoryTitle);
	const actionSegment = combineIconTitle(actionIcon, actionTitle);
	const segments = [] as string[];
	if (normalizedPrefix) {
		segments.push(normalizedPrefix);
	}
	if (categorySegment) {
		segments.push(categorySegment);
	}
	if (actionSegment) {
		segments.push(actionSegment);
	}
	if (segments.length === 0) {
		return 'Action';
	}
	if (
		segments.length === 1 &&
		segments[0] === normalizedPrefix &&
		actionSegment
	) {
		return `${normalizedPrefix} - ${actionSegment}`;
	}
	return segments.join(' - ');
}

export type { FormatActionTitleOptions };
