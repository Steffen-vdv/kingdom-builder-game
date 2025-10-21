import { LOG_KEYWORDS } from '../translation/log/logMessages';
import {
	flattenActionDiffChanges,
	type ActionDiffChange,
} from '../translation/log/diff';
import type { ActionLogLineDescriptor } from '../translation/log/timeline';

function renderTimelineLine(line: ActionLogLineDescriptor): string {
	if (line.depth <= 0) {
		return line.text;
	}
	const indent = '  '.repeat(Math.max(0, line.depth - 1));
	const marker = line.depth === 1 ? '• ' : '↳ ';
	return `${indent}${marker}${line.text}`;
}

function renderTimeline(
	descriptors: readonly ActionLogLineDescriptor[],
): string[] {
	return descriptors.map(renderTimelineLine);
}

function convertChangeTreeToDescriptors(
	changes: readonly ActionDiffChange[],
	baseDepth = 1,
): ActionLogLineDescriptor[] {
	const flattened = flattenActionDiffChanges(changes, baseDepth);
	return flattened.map<ActionLogLineDescriptor>(({ change, depth }) => ({
		text: change.summary,
		depth,
		kind: 'effect',
	}));
}

export function buildActionLogTimeline(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly ActionDiffChange[],
): ActionLogLineDescriptor[] {
	const descriptors: ActionLogLineDescriptor[] = [...messages];
	descriptors.push(...convertChangeTreeToDescriptors(changes));
	return descriptors;
}

export function buildDevelopActionLogTimeline(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly ActionDiffChange[],
): ActionLogLineDescriptor[] {
	const developmentIndex = changes.findIndex((change) => {
		return change.summary.startsWith(LOG_KEYWORDS.developed);
	});
	if (developmentIndex === -1) {
		return buildActionLogTimeline(messages, changes);
	}
	const developmentChange = changes[developmentIndex]!;
	const [, ...restMessages] = messages;
	const descriptors: ActionLogLineDescriptor[] = [
		{ text: developmentChange.summary, depth: 0, kind: 'headline' },
		...restMessages,
	];
	const remainingChanges = [
		...changes.slice(0, developmentIndex),
		...changes.slice(developmentIndex + 1),
	];
	descriptors.push(...convertChangeTreeToDescriptors(remainingChanges));
	return descriptors;
}

export function formatActionLogLines(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly ActionDiffChange[],
): string[] {
	return renderTimeline(buildActionLogTimeline(messages, changes));
}

export function formatDevelopActionLogLines(
	messages: readonly ActionLogLineDescriptor[],
	changes: readonly ActionDiffChange[],
): string[] {
	return renderTimeline(buildDevelopActionLogTimeline(messages, changes));
}

export { convertChangeTreeToDescriptors };
