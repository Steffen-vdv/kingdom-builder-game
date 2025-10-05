import { LOG_KEYWORDS } from '../translation/log/logMessages';

export function formatActionLogLines(
	messages: readonly string[],
	changes: readonly string[],
): string[] {
	const lines = [...messages];
	for (const change of changes) {
		lines.push(`  ${change}`);
	}
	return lines;
}

export function formatDevelopActionLogLines(
	messages: readonly string[],
	changes: readonly string[],
): string[] {
	let developmentHeadline: string | undefined;
	const remainingChanges: string[] = [];
	for (const change of changes) {
		if (!developmentHeadline && change.startsWith(LOG_KEYWORDS.developed)) {
			developmentHeadline = change;
			continue;
		}
		remainingChanges.push(change);
	}
	if (!developmentHeadline) {
		return formatActionLogLines(messages, changes);
	}
	const lines = [developmentHeadline, ...messages.slice(1)];
	for (const change of remainingChanges) {
		lines.push(`  ${change}`);
	}
	return lines;
}
