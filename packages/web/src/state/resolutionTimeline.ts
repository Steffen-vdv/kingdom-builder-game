import type { ActionLogLineDescriptor } from '../translation/log/timeline';

const TIMELINE_INDENT_PATTERNS = [
	/^(?: {3})/,
	/^(?:[ \t]*[•▪‣◦●]\s+)/u,
	/^(?:[ \t]*[↳➜➤➣]\s+)/u,
];

function parseTimelineLine(line: string) {
	let remaining = line;
	let depth = 0;
	let matched = true;

	while (matched) {
		matched = false;
		for (const pattern of TIMELINE_INDENT_PATTERNS) {
			const match = remaining.match(pattern);
			if (match && match[0].length > 0) {
				remaining = remaining.slice(match[0].length);
				depth += 1;
				matched = true;
				break;
			}
		}
	}

	const text = remaining.trimStart();
	return { depth, text };
}

function deriveTimelineFromLines(
	lines: readonly string[],
): ActionLogLineDescriptor[] {
	return lines.map((line, index) => {
		const { depth, text } = parseTimelineLine(line);
		return {
			text,
			depth,
			kind: index === 0 ? 'headline' : 'effect',
		};
	});
}

function isCompleteTimeline(
	timeline: readonly (ActionLogLineDescriptor | undefined)[],
): timeline is ActionLogLineDescriptor[] {
	return timeline.every((entry): entry is ActionLogLineDescriptor =>
		Boolean(entry),
	);
}

export { deriveTimelineFromLines, isCompleteTimeline };
