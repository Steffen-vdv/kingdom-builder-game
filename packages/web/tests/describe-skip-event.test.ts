import { describe, it, expect } from 'vitest';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import type { SessionAdvanceSkipSnapshot } from '@kingdom-builder/protocol/session';
import { describeSkipEvent } from '../src/utils/describeSkipEvent';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createSkipScenario() {
	const scaffold = createTestSessionScaffold();
	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as SessionPlayerId,
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		scaffold.registries,
		session.metadata,
	);
	return { context, metadataSelectors };
}

const renderLabel = (icon?: string, label?: string, fallback?: string) => {
	const trimmed = label?.trim();
	const normalized = trimmed && trimmed.length > 0 ? trimmed : (fallback ?? '');
	if (icon && icon.trim().length > 0) {
		return `${icon} ${normalized}`.trim();
	}
	return normalized;
};

describe('describeSkipEvent', () => {
	it('formats phase skip entries with source summaries', () => {
		const { context, metadataSelectors } = createSkipScenario();
		const phase = context.phases[0];
		expect(phase).toBeDefined();
		if (!phase) {
			return;
		}
		const skip: SessionAdvanceSkipSnapshot = {
			type: 'phase',
			phaseId: phase.id,
			sources: [
				{
					id: 'passive:golden-age',
					detail: 'Golden Age',
					meta: { source: { id: 'tier:golden', icon: '✨' } },
				},
			],
		};
		const phaseDescriptor = metadataSelectors.phaseMetadata.select(phase.id);
		const phaseLabel = renderLabel(
			phase.icon,
			phase.label ?? phaseDescriptor.label,
			phase.id,
		);

		const result = describeSkipEvent(skip, phase, undefined, context.assets);

		expect(result.logLines[0]).toContain('Phase skipped');
		expect(result.logLines[1]).toContain('Golden Age');
		expect(result.history.title).toBe(`${phaseLabel} Phase`);
		expect(result.history.items[0]?.italic).toBe(true);
		expect(result.history.items[0]?.text).toContain('Golden Age');
	});

	it('formats step skip entries with fallback labels', () => {
		const { context } = createSkipScenario();
		const phase = context.phases.find((entry) => entry.steps?.length);
		expect(phase?.steps?.[0]).toBeDefined();
		if (!phase?.steps?.[0]) {
			return;
		}
		const step = phase.steps[0];
		const skip: SessionAdvanceSkipSnapshot = {
			type: 'step',
			phaseId: phase.id,
			stepId: step.id,
			sources: [
				{
					id: 'passive:morale-crash',
					meta: { source: { id: 'tier:grim', labelToken: 'tier.grim' } },
				},
			],
		};

		const result = describeSkipEvent(skip, phase, step, context.assets);
		const stepLabel = renderLabel(step.icon, step.title, step.id);

		expect(result.logLines[0]).toContain(stepLabel.trim() || step.id);
		expect(result.logLines).toHaveLength(2);
		expect(result.history.title).toBe(step.title ?? step.id);
		expect(result.history.items[0]?.text).toContain('tier.grim');
	});

	it('lists each skip source on separate log lines', () => {
		const { context } = createSkipScenario();
		const phase = context.phases[0];
		expect(phase).toBeDefined();
		if (!phase) {
			return;
		}
		const skip: SessionAdvanceSkipSnapshot = {
			type: 'phase',
			phaseId: phase.id,
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

		const result = describeSkipEvent(skip, phase, undefined, context.assets);

		expect(result.logLines).toHaveLength(3);
		expect(result.logLines[0]).toContain('Phase skipped');
		expect(result.logLines[1]).toMatch(/^\s+• /);
		expect(result.logLines[2]).toMatch(/^\s+• /);
		expect(result.history.items[0]?.text).toContain('First Source');
		expect(result.history.items[0]?.text).toContain('tier:second');
	});

	it('uses the phase descriptor strategy when the skip type is phase', () => {
		const { context } = createSkipScenario();
		const phase = context.phases[0];
		expect(phase).toBeDefined();
		if (!phase) {
			return;
		}
		const phaseLabel = renderLabel(phase.icon, phase.label, phase.id);
		const skip: SessionAdvanceSkipSnapshot = {
			type: 'phase',
			phaseId: phase.id,
			sources: [],
		};

		const result = describeSkipEvent(skip, phase, undefined, context.assets);

		expect(result.logLines).toEqual([`⏭️ ${phaseLabel} Phase skipped`]);
		expect(result.history).toEqual({
			title: `${phaseLabel} Phase`,
			items: [{ text: 'Skipped', italic: true }],
		});
	});

	it('uses the step descriptor strategy when the skip type is step', () => {
		const { context } = createSkipScenario();
		const phase = context.phases.find((entry) => entry.steps?.length);
		expect(phase?.steps?.[0]).toBeDefined();
		if (!phase?.steps?.[0]) {
			return;
		}
		const step = phase.steps[0];
		const skip: SessionAdvanceSkipSnapshot = {
			type: 'step',
			phaseId: phase.id,
			stepId: step.id,
			sources: [],
		};

		const result = describeSkipEvent(skip, phase, undefined, context.assets);

		expect(result.logLines).toEqual([`⏭️ ${skip.stepId} skipped`]);
		expect(result.history).toEqual({
			title: skip.stepId ?? 'Skipped Step',
			items: [{ text: 'Skipped', italic: true }],
		});
	});

	it('falls back to the default descriptor for unrecognised skip types', () => {
		const { context } = createSkipScenario();
		const phase = context.phases[0];
		expect(phase).toBeDefined();
		if (!phase) {
			return;
		}
		const skip = {
			type: 'unknown',
			phaseId: phase.id,
			stepId: phase.steps?.[0]?.id ?? 'prepare',
			sources: [],
		} as SessionAdvanceSkipSnapshot;

		const result = describeSkipEvent(skip, phase, undefined, context.assets);

		const stepLabel = skip.stepId ?? 'prepare';
		expect(result.logLines).toEqual([`⏭️ ${stepLabel} skipped`]);
		expect(result.history).toEqual({
			title: stepLabel,
			items: [{ text: 'Skipped', italic: true }],
		});
	});
});
