export const LOG_KEYWORDS = {
	built: 'Built',
	gained: 'Gained',
	developed: 'Developed',
} as const;

export function formatIconLabel(
	icon: string | undefined,
	label: string | undefined,
): string {
	const normalizedIcon = icon?.trim() ?? '';
	const normalizedLabel = label?.trim() ?? '';
	if (normalizedIcon && normalizedLabel) {
		return `${normalizedIcon} ${normalizedLabel}`;
	}
	return normalizedIcon || normalizedLabel;
}

export function formatLogHeadline(keyword: string, label: string): string {
	const normalizedKeyword = keyword.trim();
	const normalizedLabel = label.trim();
	if (!normalizedLabel) {
		return normalizedKeyword;
	}
	return `${normalizedKeyword} ${normalizedLabel}`;
}
