import { describe, expect, it } from 'vitest';
import {
	formatActionLogLines,
	formatDevelopActionLogLines,
} from '../src/state/actionLogFormat';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

describe('action log line formatting', () => {
	it('nests development changes under the development headline', () => {
		const messages: ActionLogLineDescriptor[] = [
			{ text: '🏗️ Develop', depth: 0, kind: 'headline' },
			{ text: '💲 Action cost', depth: 1, kind: 'cost' },
		];
		const changes = [
			`${LOG_KEYWORDS.developed} 🗼 Watchtower`,
			'🛡️ Fortification Strength +2 (0→2)',
			'🌀 Absorption +50% (0%→50%)',
		];
		expect(formatDevelopActionLogLines(messages, changes)).toEqual([
			`${LOG_KEYWORDS.developed} 🗼 Watchtower`,
			'• 💲 Action cost',
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
});
