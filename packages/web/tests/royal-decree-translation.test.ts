import { describe, expect, it, vi } from 'vitest';
import {
	createEngine,
	getActionEffectGroups,
	type EngineContext,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import {
	describeContent,
	summarizeContent,
	type SummaryEntry,
} from '../src/translation';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const context = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});

function combineLabels(left: string, right: string): string {
	const base = left.trim();
	const entry = right.trim();
	if (entry.length === 0) {
		return base;
	}
	if (base.length === 0) {
		return entry;
	}
	return `${base} - ${entry}`;
}

function normalizeDescribedTitle(
	describedTitle: string | undefined,
	developmentLabel: string,
): string {
	if (!describedTitle) {
		return developmentLabel;
	}
	const trimmed = describedTitle.trim();
	if (trimmed.length === 0) {
		return developmentLabel;
	}
	if (developmentLabel.startsWith(trimmed)) {
		return developmentLabel;
	}
	if (trimmed.startsWith('Add ')) {
		const withoutAdd = trimmed.slice(4).trim();
		if (withoutAdd.length > 0 && developmentLabel.startsWith(withoutAdd)) {
			return developmentLabel;
		}
	}
	return trimmed;
}

function findGroupEntry(
	entries: SummaryEntry[],
): Extract<SummaryEntry, { title: string; items: SummaryEntry[] }> {
	const group = entries.find(
		(
			entry,
		): entry is Extract<
			SummaryEntry,
			{ title: string; items: SummaryEntry[] }
		> => typeof entry === 'object' && entry.title.includes('Choose one'),
	);
	if (!group) {
		throw new Error('Expected effect group entry');
	}
	return group;
}

describe('royal decree translation', () => {
	const actionId = 'royal_decree';
	const developAction = context.actions.get('develop');
	const developLabel = combineLabels(
		`${developAction.icon ?? ''} ${developAction.name ?? ''}`,
		'',
	);
	const effectGroups = getActionEffectGroups(
		actionId,
		context as EngineContext,
	);
	const developGroup = effectGroups.find(
		(group) => group.id === 'royal_decree_develop',
	);
	if (!developGroup) {
		throw new Error('Expected royal decree develop group');
	}
	const developmentOptions = developGroup.options.map((option) => {
		const params = option.params as { id?: string } | undefined;
		return params?.id ?? '';
	});

	it('summarizes options using develop action label', () => {
		const summary = summarizeContent(
			'action',
			actionId,
			context as EngineContext,
		);
		const group = findGroupEntry(summary);
		expect(group.items).toHaveLength(developmentOptions.length);
		for (const id of developmentOptions) {
			const development = context.developments.get(id);
			const developmentLabel = combineLabels(
				`${development.icon ?? ''} ${development.name ?? ''}`,
				'',
			);
			const expectedTitle = combineLabels(developLabel, developmentLabel);
			const entry = group.items.find((item) =>
				typeof item === 'string'
					? item === expectedTitle
					: item.title === expectedTitle,
			);
			expect(entry).toBeDefined();
			expect(typeof entry).toBe('string');
		}
	});

	it('describes options with nested develop effects', () => {
		const description = describeContent(
			'action',
			actionId,
			context as EngineContext,
		);
		const group = findGroupEntry(description);
		expect(group.items).toHaveLength(developmentOptions.length);
		for (const id of developmentOptions) {
			const development = context.developments.get(id);
			const developmentLabel = combineLabels(
				`${development.icon ?? ''} ${development.name ?? ''}`,
				'',
			);
			const described = describeContent(
				'action',
				'develop',
				context as EngineContext,
				{ id },
			);
			const describedLabel = described[0];
			const describedTitle =
				typeof describedLabel === 'string'
					? describedLabel
					: describedLabel?.title;
			const normalizedTitle = normalizeDescribedTitle(
				describedTitle,
				developmentLabel,
			);
			const expectedTitle = combineLabels(developLabel, normalizedTitle);
			const entry = group.items.find((item) =>
				typeof item === 'string'
					? item === expectedTitle
					: item.title === expectedTitle,
			);
			expect(entry).toBeDefined();
			if (!entry) {
				continue;
			}
			if (typeof entry === 'string') {
				expect(entry).toBe(expectedTitle);
				continue;
			}
			expect(entry.title).toBe(expectedTitle);
			expect(entry.items).toContain(normalizedTitle);
		}
	});
});
