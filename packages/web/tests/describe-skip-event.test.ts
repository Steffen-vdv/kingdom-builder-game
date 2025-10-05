import { describe, it, expect } from 'vitest';
import type { AdvanceSkip } from '@kingdom-builder/engine';
import { describeSkipEvent } from '../src/utils/describeSkipEvent';
import { PhaseId, PhaseStepId } from '@kingdom-builder/contents';

describe('describeSkipEvent', () => {
	it('formats phase skip entries with source summaries', () => {
		const skip: AdvanceSkip = {
			type: 'phase',
			phaseId: PhaseId.Growth,
			sources: [
				{
					id: 'passive:golden-age',
					detail: 'Golden Age',
					meta: { source: { id: 'tier:golden', icon: '✨' } },
				},
			],
		};
		const phase = { id: PhaseId.Growth, label: 'Growth', icon: '🌱' };

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
			phaseId: PhaseId.Upkeep,
			stepId: PhaseStepId.WarRecovery,
			sources: [
				{
					id: 'passive:morale-crash',
					meta: { source: { id: 'tier:grim', labelToken: 'tier.grim' } },
				},
			],
		};
		const phase = { id: PhaseId.Upkeep, label: 'Upkeep', icon: '🧹' };
		const step = {
			id: PhaseStepId.WarRecovery,
			title: 'War recovery',
			icon: '🛡️',
		};

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

	it('uses the phase descriptor strategy when the skip type is phase', () => {
		const skip: AdvanceSkip = {
			type: 'phase',
			phaseId: 'dawn',
			sources: [],
		};
		const phase = { id: 'dawn', label: 'Dawn', icon: '🌅' };

		const result = describeSkipEvent(skip, phase);

		expect(result.logLines).toEqual(['⏭️ 🌅 Dawn Phase skipped']);
		expect(result.history).toEqual({
			title: '🌅 Dawn Phase',
			items: [{ text: 'Skipped', italic: true }],
		});
	});

	it('uses the step descriptor strategy when the skip type is step', () => {
		const skip: AdvanceSkip = {
			type: 'step',
			phaseId: 'dawn',
			stepId: 'prepare',
			sources: [],
		};
		const phase = { id: 'dawn', label: 'Dawn', icon: '🌅' };

		const result = describeSkipEvent(skip, phase);

		expect(result.logLines).toEqual(['⏭️ prepare skipped']);
		expect(result.history).toEqual({
			title: 'prepare',
			items: [{ text: 'Skipped', italic: true }],
		});
	});

	it('falls back to the default descriptor for unrecognised skip types', () => {
		const skip = {
			type: 'unknown',
			phaseId: 'dawn',
			stepId: 'prepare',
			sources: [],
		} as AdvanceSkip;
		const phase = { id: 'dawn', label: 'Dawn', icon: '🌅' };

		const result = describeSkipEvent(skip, phase);

		expect(result.logLines).toEqual(['⏭️ prepare skipped']);
		expect(result.history).toEqual({
			title: 'prepare',
			items: [{ text: 'Skipped', italic: true }],
		});
	});
});
