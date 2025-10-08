import { LOG_KEYWORDS } from '../translation/log/logMessages';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

function renderTimelineLine(line: ActionLogLineDescriptor): string {
	if (line.depth <= 0) {
		return line.text;
	}
	const indent = '  '.repeat(Math.max(0, line.depth - 1));
	const marker = line.depth === 1 ? '• ' : '↳ ';
	return `${indent}${marker}${line.text}`;
}

function appendChangeDescriptors(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly string[],
): ActionLogLineDescriptor[] {
	const descriptors: ActionLogLineDescriptor[] = [...messages];
	for (const change of changes) {
		descriptors.push({ text: change, depth: 1, kind: 'change' });
	}
	return descriptors;
}

export function formatActionLogLines(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly string[],
): string[] {
	return appendChangeDescriptors(messages, changes).map(renderTimelineLine);
}

export function formatDevelopActionLogLines(
	messages: readonly ActionLogLineDescriptor[],
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
	const [, ...restMessages] = messages;
	const descriptors: ActionLogLineDescriptor[] = [
		{ text: developmentHeadline, depth: 0, kind: 'headline' },
		...restMessages,
	];
	for (const change of remainingChanges) {
		descriptors.push({ text: change, depth: 1, kind: 'change' });
	}
	return descriptors.map(renderTimelineLine);
}
