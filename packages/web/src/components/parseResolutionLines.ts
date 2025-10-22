import { normalizeModifierDescription } from './ResolutionTimeline';

interface FallbackResolutionLine {
	depth: number;
	text: string;
}

const INDENT_PATTERNS: readonly RegExp[] = [
	/^(?: {3})/u,
	/^(?:[ \t]*[•▪‣◦●]\s+)/u,
	/^(?:[ \t]*[↳➜➤➣]\s+)/u,
];

function parseResolutionLine(line: string): FallbackResolutionLine {
	let remaining = line;
	let depth = 0;
	let matched = true;

	while (matched) {
		matched = false;
		for (const pattern of INDENT_PATTERNS) {
			const match = remaining.match(pattern);
			if (match && match[0].length > 0) {
				remaining = remaining.slice(match[0].length);
				depth += 1;
				matched = true;
				break;
			}
		}
	}

	const text = normalizeModifierDescription(remaining.trimStart());
	return { depth, text };
}

function buildFallbackResolutionLines(
	lines: readonly string[],
): FallbackResolutionLine[] {
	return lines.map((line) => parseResolutionLine(line));
}

export type { FallbackResolutionLine };
export { buildFallbackResolutionLines };
