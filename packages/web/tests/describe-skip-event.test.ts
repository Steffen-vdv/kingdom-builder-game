import { describe, it, expect } from 'vitest';
import type { AdvanceSkip } from '@kingdom-builder/engine';
import { describeSkipEvent } from '../src/utils/describeSkipEvent';

describe('describeSkipEvent', () => {
	it('formats phase skip entries with source summaries', () => {
		const skip: AdvanceSkip = {
			type: 'phase',
			phaseId: 'growth',
			sources: [
				{
					id: 'passive:golden-age',
					detail: 'Golden Age',
					meta: { source: { id: 'tier:golden', icon: '✨' } },
				},
			],
		};
		const phase = { id: 'growth', label: 'Growth', icon: '🌱' };

		const result = describeSkipEvent(skip, phase);

		expect(result.logLines[0]).toContain('Phase skipped');
		expect(result.logLines[1]).toContain('Golden Age');
		expect(result.history.title).toBe('🌱 Growth Phase');
		expect(result.history.items[0]?.italic).toBe(true);
		expect(result.history.items[0]?.text).toContain('Golden Age');
	});

	it('formats step skip entries with fallback labels', () => {
		const skip: AdvanceSkip = {
			type: 'step',
			phaseId: 'upkeep',
			stepId: 'war-recovery',
			sources: [
				{
					id: 'passive:morale-crash',
					meta: { source: { id: 'tier:grim', labelToken: 'tier.grim' } },
				},
			],
		};
		const phase = { id: 'upkeep', label: 'Upkeep', icon: '🧹' };
		const step = { id: 'war-recovery', title: 'War recovery', icon: '🛡️' };

		const result = describeSkipEvent(skip, phase, step);

		expect(result.logLines[0]).toContain('War recovery');
		expect(result.logLines).toHaveLength(2);
		expect(result.history.title).toBe('War recovery');
		expect(result.history.items[0]?.text).toContain('tier.grim');
	});

	it('lists each skip source on separate log lines', () => {
		const skip: AdvanceSkip = {
			type: 'phase',
			phaseId: 'twilight',
			sources: [
				{
					id: 'passive:first',
					detail: 'First Source',
					meta: { source: { id: 'tier:first', icon: '✨' } },
				},
				{
					id: 'passive:second',
					meta: { source: { id: 'tier:second', icon: '⚔️' } },
				},
			],
		};
		const phase = { id: 'twilight', label: 'Twilight', icon: '🌒' };

		const result = describeSkipEvent(skip, phase);

		expect(result.logLines).toHaveLength(3);
		expect(result.logLines[0]).toContain('Phase skipped');
		expect(result.logLines[1]).toMatch(/^\s+• /);
		expect(result.logLines[2]).toMatch(/^\s+• /);
		expect(result.history.items[0]?.text).toContain('First Source');
		expect(result.history.items[0]?.text).toContain('tier:second');
	});
});
