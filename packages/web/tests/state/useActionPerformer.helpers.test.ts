import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionTrace } from '@kingdom-builder/protocol/actions';
import { appendSubActionChanges } from '../../src/state/useActionPerformer.helpers';
import type { TranslationContext } from '../../src/translation/context';
import type { TranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import type { ActionLogLineDescriptor } from '../../src/translation/log/timeline';

const resolveActionEffectsMock = vi.hoisted(() => vi.fn());
const snapshotPlayerMock = vi.hoisted(() => vi.fn());
const diffStepSnapshotsMock = vi.hoisted(() => vi.fn());

vi.mock('@kingdom-builder/protocol', async () => {
	const actual = await vi.importActual('@kingdom-builder/protocol');
	return {
		...(actual as Record<string, unknown>),
		resolveActionEffects: resolveActionEffectsMock,
	};
});

vi.mock('../../src/translation', async () => {
	const actual = await vi.importActual('../../src/translation');
	return {
		...(actual as Record<string, unknown>),
		snapshotPlayer: snapshotPlayerMock,
		diffStepSnapshots: diffStepSnapshotsMock,
	};
});

describe('appendSubActionChanges', () => {
	beforeEach(() => {
		resolveActionEffectsMock.mockReset();
		snapshotPlayerMock.mockReset();
		diffStepSnapshotsMock.mockReset();
		diffStepSnapshotsMock.mockReturnValue({ tree: [], summaries: [] });
	});

	it('skips diff generation when the sub-action is missing from the translation context', () => {
		const trace = {
			id: 'missing.action',
			before: {},
			after: {},
		} as unknown as ActionTrace;
		const traces = [trace];
		const context = {
			actions: {
				get: vi.fn(() => undefined),
				has: vi.fn(() => false),
			},
		} as unknown as TranslationContext;
		const diffContext = {} as TranslationDiffContext;
		const resourceKeys: string[] = [];
		const messages: ActionLogLineDescriptor[] = [];

		let subLines: string[] = [];
		expect(() => {
			subLines = appendSubActionChanges({
				traces,
				context,
				diffContext,
				resourceKeys,
				messages,
			});
		}).not.toThrow();

		expect(resolveActionEffectsMock).not.toHaveBeenCalled();
		expect(snapshotPlayerMock).not.toHaveBeenCalled();
		expect(diffStepSnapshotsMock).not.toHaveBeenCalled();
		expect(subLines).toHaveLength(0);
		expect(messages).toHaveLength(0);
	});
});
