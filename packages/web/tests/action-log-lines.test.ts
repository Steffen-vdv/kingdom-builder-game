import { describe, expect, it } from 'vitest';
import {
	buildActionLogTimeline,
	formatActionLogLines,
	formatDevelopActionLogLines,
} from '../src/state/actionLogFormat';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

describe('action log line formatting', () => {
	it('nests development changes under the development headline', () => {
		const messages: ActionLogLineDescriptor[] = [
			{ text: '🏗️ Develop', depth: 0, kind: 'headline' },
			{ text: 'Gold -3', depth: 1, kind: 'cost' },
		];
		const changes = [
			`${LOG_KEYWORDS.developed} 🗼 Watchtower`,
			'🛡️ Fortification Strength +2 (0→2)',
			'🌀 Absorption +50% (0%→50%)',
		];
		expect(formatDevelopActionLogLines(messages, changes)).toEqual([
			`${LOG_KEYWORDS.developed} 🗼 Watchtower`,
			'• Gold -3',
			'• 🛡️ Fortification Strength +2 (0→2)',
			'• 🌀 Absorption +50% (0%→50%)',
		]);
	});

	it('falls back to default formatting without a development headline', () => {
		const messages: ActionLogLineDescriptor[] = [
			{ text: '💰 Tax', depth: 0, kind: 'headline' },
		];
		const changes = ['Gold +3', 'Happiness -1'];
		expect(formatDevelopActionLogLines(messages, changes)).toEqual([
			'💰 Tax',
			'• Gold +3',
			'• Happiness -1',
		]);
		expect(formatActionLogLines(messages, changes)).toEqual([
			'💰 Tax',
			'• Gold +3',
			'• Happiness -1',
		]);
	});

	it('builds a timeline with change descriptors for appended entries', () => {
		const messages: ActionLogLineDescriptor[] = [
			{ text: 'Phase start', depth: 0, kind: 'headline' },
		];
		const changes = ['Gold +3'];
		expect(buildActionLogTimeline(messages, changes)).toEqual([
			{ text: 'Phase start', depth: 0, kind: 'headline' },
			{ text: 'Gold +3', depth: 1, kind: 'change' },
		]);
		expect(formatActionLogLines(messages, changes)).toEqual([
			'Phase start',
			'• Gold +3',
		]);
	});
});
