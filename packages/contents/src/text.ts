export function formatPassiveRemoval(condition: string): string {
	const trimmed = condition.trim();
	const detail = trimmed.length > 0 ? trimmed : condition;
	return `Active as long as ${detail}`;
}
