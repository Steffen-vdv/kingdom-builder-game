import { describe, expect, it } from 'vitest';
import {
	describeContent,
	summarizeContent,
	formatEffectGroups,
	logContent,
	type SummaryEntry,
} from '../src/translation';
import { resolveActionEffects } from '@kingdom-builder/protocol';
import type { ActionConfig } from '@kingdom-builder/protocol';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

interface ActionEffectGroupOption {
	optionId: string;
	actionId?: string;
	developmentId?: string;
	icon?: string;
}

interface ActionEffectGroupEntry {
	id?: string;
	title?: string;
	options?: ActionEffectGroupOption[];
}

interface RoyalDecreeActionInfo {
	id: string;
	action: ActionConfig;
	developGroup: ActionEffectGroupEntry;
	options: ActionEffectGroupOption[];
}

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
	titleMatch: string,
): Extract<SummaryEntry, { title: string; items: SummaryEntry[] }> {
	const group = entries.find(
		(
			entry,
		): entry is Extract<
			SummaryEntry,
			{ title: string; items: SummaryEntry[] }
		> =>
			typeof entry === 'object' &&
			typeof entry.title === 'string' &&
			entry.title.includes(titleMatch),
	);
	if (!group) {
		throw new Error('Expected effect group entry');
	}
	return group;
}

function isActionEffectGroup(entry: unknown): entry is ActionEffectGroupEntry {
	if (!entry || typeof entry !== 'object') {
		return false;
	}
	return Array.isArray((entry as { options?: unknown[] }).options);
}

function extractGroupOptions(
	action: ActionConfig,
): RoyalDecreeActionInfo | undefined {
	for (const entry of action.effects ?? []) {
		if (!isActionEffectGroup(entry)) {
			continue;
		}
		const options = (entry.options ?? []).map((rawOption) => {
			const option = rawOption as {
				id?: string;
				optionId?: string;
				actionId?: string;
				icon?: string;
				params?: { developmentId?: string; id?: string };
			};
			const params = option.params;
			const developmentId = params?.developmentId ?? params?.id;
			return {
				optionId: option.optionId ?? option.id ?? '',
				actionId: option.actionId,
				developmentId,
				icon: option.icon,
			} satisfies ActionEffectGroupOption;
		});
		const developOptions = options.filter(
			(
				option,
			): option is ActionEffectGroupOption & {
				developmentId: string;
				actionId: string;
			} =>
				typeof option.developmentId === 'string' &&
				typeof option.actionId === 'string',
		);
		if (developOptions.length > 0) {
			return {
				id: action.id,
				action,
				developGroup: {
					id: entry.id,
					title: entry.title,
					options,
				},
				options: developOptions,
			} satisfies RoyalDecreeActionInfo;
		}
	}
	return undefined;
}

describe('royal decree translation', () => {
	const { translationContext, registries } = buildSyntheticTranslationContext();
	const actionInfo = (() => {
		for (const [, action] of registries.actions.entries()) {
			const info = extractGroupOptions(action);
			if (info) {
				return info;
			}
		}
		throw new Error('Expected royal decree action with develop options');
	})();
	it('summarizes options using develop action label', () => {
		const summary = summarizeContent(
			'action',
			actionInfo.id,
			translationContext,
		);
		const summaryAgain = summarizeContent(
			'action',
			actionInfo.id,
			translationContext,
		);
		const groupTitle = actionInfo.developGroup.title ?? 'Choose one';
		const group = findGroupEntry(summary, groupTitle);
		expect(group.items).toHaveLength(actionInfo.options.length);
		for (const option of actionInfo.options) {
			const developmentId = option.developmentId as string;
			const development = translationContext.developments.get(developmentId);
			const developmentLabel = combineLabels(
				`${development.icon ?? ''} ${development.name ?? developmentId}`,
				'',
			);
			const optionAction = translationContext.actions.get(option.actionId);
			const optionLabel = combineLabels(
				`${optionAction.icon ?? ''} ${optionAction.name ?? option.actionId}`,
				'',
			);
			const expectedTitle = combineLabels(optionLabel, developmentLabel);
			const entry = group.items.find((item) =>
				typeof item === 'string'
					? item === expectedTitle
					: item.title === expectedTitle,
			);
			expect(entry).toBeDefined();
			expect(typeof entry).toBe('string');
		}
		expect(summaryAgain).toEqual(summary);
	});

	it('describes options with nested develop effects', () => {
		const description = describeContent(
			'action',
			actionInfo.id,
			translationContext,
		);
		const groupTitle = actionInfo.developGroup.title ?? 'Choose one';
		const group = findGroupEntry(description, groupTitle);
		expect(group.items).toHaveLength(actionInfo.options.length);
		for (const option of actionInfo.options) {
			const developmentId = option.developmentId as string;
			const development = translationContext.developments.get(developmentId);
			const developmentLabel = combineLabels(
				`${development.icon ?? ''} ${development.name ?? developmentId}`,
				'',
			);
			const described = describeContent(
				'action',
				option.actionId,
				translationContext,
				{
					id: developmentId,
				},
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
			const optionAction = translationContext.actions.get(option.actionId);
			const optionLabel = combineLabels(
				`${optionAction.icon ?? ''} ${optionAction.name ?? option.actionId}`,
				'',
			);
			const expectedTitle = combineLabels(optionLabel, normalizedTitle);
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

	it('logs selected develop option using develop action copy', () => {
		const developmentId = actionInfo.options[0]?.developmentId;
		if (!developmentId) {
			throw new Error('Expected development option');
		}
		const actionDefinition = translationContext.actions.get(actionInfo.id);
		const resolved = resolveActionEffects(actionDefinition, {
			landId: 'A-L1',
			choices: {
				[actionInfo.developGroup.id ?? 'royal_decree_develop']: {
					optionId: actionInfo.options[0]?.optionId ?? 'royal_decree_option',
					params: {
						landId: 'A-L1',
						developmentId,
					},
				},
			},
		});
		const entries = formatEffectGroups(
			resolved.steps,
			'log',
			translationContext,
		);
		const groupTitle = actionInfo.developGroup.title ?? 'Choose one';
		const group = findGroupEntry(entries, groupTitle);
		const [entry] = group.items;
		const development = translationContext.developments.get(developmentId);
		if (typeof entry === 'string') {
			expect(entry).toContain(development.name ?? developmentId);
			return;
		}
		const selectedOption = actionInfo.options.find(
			(option) => option.developmentId === developmentId,
		);
		if (!selectedOption) {
			throw new Error('Expected selected option for development');
		}
		const optionAction = translationContext.actions.get(
			selectedOption.actionId,
		);
		const optionLabel = combineLabels(
			`${optionAction.icon ?? ''} ${optionAction.name ?? selectedOption.actionId}`,
			'',
		);
		expect(entry.title).toBe(optionLabel);
		expect(entry.timelineKind).toBe('subaction');
		expect(entry.actionId).toBe(selectedOption.actionId);
		const entryItems = Array.isArray(entry.items)
			? entry.items
			: entry.items
				? [entry.items]
				: [];
		const hasDevelopmentLine = entryItems.some((item) => {
			const text = typeof item === 'string' ? item : item?.title;
			return text?.includes(development.name ?? developmentId) ?? false;
		});
		expect(hasDevelopmentLine).toBe(true);
	});

	it('logs royal decree develop once using develop action copy', () => {
		const developmentId = actionInfo.options[0]?.developmentId;
		if (!developmentId) {
			throw new Error('Expected development option');
		}
		const logLines = logContent('action', actionInfo.id, translationContext, {
			landId: 'A-L1',
			choices: {
				[actionInfo.developGroup.id ?? 'royal_decree_develop']: {
					optionId: actionInfo.options[0]?.optionId ?? 'royal_decree_option',
					params: {
						landId: 'A-L1',
						developmentId,
					},
				},
			},
		});
		const joined = logLines
			.map((line) => (typeof line === 'string' ? line : line.text))
			.join('\n');
		const occurrences = joined.match(/Developed [^\n]*/gu) ?? [];
		expect(occurrences.length).toBeLessThanOrEqual(1);
		if (occurrences.length === 1) {
			expect(occurrences[0]).toContain(
				translationContext.developments.get(developmentId).name ??
					developmentId,
			);
		}
	});
});
