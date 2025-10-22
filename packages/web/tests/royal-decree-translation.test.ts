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
import { formatActionTitle } from '../src/utils/formatActionTitle';
import { getActionCategoryId } from '../src/utils/actionCategory';
import {
	DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID,
	type DevelopmentActionId,
} from '@kingdom-builder/contents/actions';
import type { DevelopmentId } from '@kingdom-builder/contents/developments';

interface ActionEffectGroupOption {
	optionId: string;
	actionId: string;
	developmentId: string;
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

const DEVELOPMENT_ID_BY_ACTION_ID = Object.fromEntries(
	Object.entries(DEVELOPMENT_ACTION_ID_BY_DEVELOPMENT_ID).map(
		([developmentId, actionId]) => [actionId, developmentId],
	),
) as Record<DevelopmentActionId, DevelopmentId>;

function buildDefinitionLabel(
	definition:
		| { icon?: string | undefined; name?: string | undefined }
		| undefined,
	fallback: string,
): string {
	const icon = typeof definition?.icon === 'string' ? definition.icon : '';
	const name =
		typeof definition?.name === 'string' ? definition.name : fallback;
	const combined = [icon, name].filter(Boolean).join(' ').trim();
	return combined.length > 0 ? combined : fallback;
}

function extractEntryTitle(entry: SummaryEntry): string {
	if (typeof entry === 'string') {
		return entry.trim();
	}
	if (typeof entry.title === 'string') {
		return entry.title.trim();
	}
	return '';
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
		const developOptions: ActionEffectGroupOption[] = [];
		for (const rawOption of entry.options ?? []) {
			const option = rawOption as {
				id?: string;
				optionId?: string;
				actionId?: string;
				icon?: string;
				params?: { developmentId?: string; id?: string };
			};
			const actionId = option.actionId as string | undefined;
			const params = option.params;
			const mappedDevelopmentId = actionId
				? DEVELOPMENT_ID_BY_ACTION_ID[actionId as DevelopmentActionId]
				: undefined;
			const developmentId =
				params?.developmentId ?? params?.id ?? mappedDevelopmentId;
			if (!actionId || !developmentId) {
				continue;
			}
			developOptions.push({
				optionId: option.optionId ?? option.id ?? '',
				actionId,
				developmentId,
				icon: option.icon,
			});
		}
		if (developOptions.length > 0) {
			return {
				id: action.id,
				action,
				developGroup: {
					id: entry.id,
					title: entry.title,
					options: developOptions,
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

	const buildDevelopActionLabel = (actionId: string): string => {
		const developAction = translationContext.actions.get(actionId);
		if (!developAction) {
			throw new Error(`Missing develop action definition for ${actionId}`);
		}
		const actionIcon =
			typeof developAction.icon === 'string' ? developAction.icon : undefined;
		const actionTitle =
			typeof developAction.name === 'string' ? developAction.name : actionId;
		const categoryId = getActionCategoryId(
			developAction as { category?: unknown },
		);
		const categoryDefinition =
			categoryId && translationContext.actionCategories.has(categoryId)
				? translationContext.actionCategories.get(categoryId)
				: undefined;
		const categoryIcon =
			typeof categoryDefinition?.icon === 'string'
				? categoryDefinition.icon
				: undefined;
		const categoryTitle =
			typeof categoryDefinition?.title === 'string'
				? categoryDefinition.title
				: categoryId;
		const options = { actionTitle } as {
			categoryIcon?: string;
			categoryTitle?: string;
			actionIcon?: string;
			actionTitle: string;
		};
		if (typeof categoryIcon !== 'undefined') {
			options.categoryIcon = categoryIcon;
		}
		if (typeof categoryTitle !== 'undefined') {
			options.categoryTitle = categoryTitle;
		}
		if (typeof actionIcon !== 'undefined') {
			options.actionIcon = actionIcon;
		}
		return formatActionTitle(options);
	};

	const expectEntryIncludesLabels = (
		entry: SummaryEntry,
		actionLabel: string,
		targetLabel: string,
	): void => {
		const title = extractEntryTitle(entry);
		expect(title).toContain(actionLabel);
		expect(title).toContain(targetLabel);
		expect(title.startsWith(actionLabel)).toBe(true);
	};

	const extractEntryItems = (entry: SummaryEntry): SummaryEntry[] => {
		if (typeof entry === 'string') {
			return [];
		}
		const items = entry.items ?? [];
		return Array.isArray(items) ? items : [items];
	};
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
			const formattedActionTitle = buildDevelopActionLabel(option.actionId);
			const developmentId = option.developmentId as string;
			const development = translationContext.developments.get(developmentId);
			if (!development) {
				throw new Error(`Missing development definition for ${developmentId}`);
			}
			const developmentLabel = buildDefinitionLabel(development, developmentId);
			const entry = group.items.find((item) => {
				const title = extractEntryTitle(item);
				return title.startsWith(formattedActionTitle);
			});
			expect(entry).toBeDefined();
			if (!entry) {
				continue;
			}
			expectEntryIncludesLabels(entry, formattedActionTitle, developmentLabel);
			if (typeof entry !== 'string') {
				const detailEntries = extractEntryItems(entry);
				const containsDevelopmentDetail = detailEntries
					.map(extractEntryTitle)
					.some((detail) => detail.includes(developmentLabel));
				expect(containsDevelopmentDetail).toBe(true);
			}
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
			const formattedActionTitle = buildDevelopActionLabel(option.actionId);
			const developmentId = option.developmentId as string;
			const development = translationContext.developments.get(developmentId);
			if (!development) {
				throw new Error(`Missing development definition for ${developmentId}`);
			}
			const developmentLabel = buildDefinitionLabel(development, developmentId);
			const described = describeContent(
				'action',
				option.actionId,
				translationContext,
				{ id: developmentId },
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
			const entry = group.items.find((item) => {
				const title = extractEntryTitle(item);
				return title.startsWith(formattedActionTitle);
			});
			expect(entry).toBeDefined();
			if (!entry) {
				continue;
			}
			expectEntryIncludesLabels(entry, formattedActionTitle, normalizedTitle);
			const detailEntries = extractEntryItems(entry);
			const includesNormalizedTitle = detailEntries
				.map(extractEntryTitle)
				.some((detail) => detail.includes(normalizedTitle));
			expect(includesNormalizedTitle).toBe(true);
		}
	});

	it('logs selected develop option using develop action copy', () => {
		const selectedOption = actionInfo.options[0];
		if (!selectedOption) {
			throw new Error('Expected development option');
		}
		const { developmentId, actionId: developActionId } = selectedOption;
		const actionDefinition = translationContext.actions.get(actionInfo.id);
		const resolved = resolveActionEffects(actionDefinition, {
			landId: 'A-L1',
			choices: {
				[actionInfo.developGroup.id ?? 'royal_decree_develop']: {
					optionId: selectedOption.optionId ?? 'royal_decree_option',
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
		if (!development) {
			throw new Error(`Missing development definition for ${developmentId}`);
		}
		const developmentLabel = buildDefinitionLabel(development, developmentId);
		const formattedActionTitle = buildDevelopActionLabel(developActionId);
		expect(entry).toBeDefined();
		if (!entry) {
			return;
		}
		if (typeof entry === 'string') {
			expect(entry).toContain(formattedActionTitle);
			expect(entry).toContain(developmentLabel);
			return;
		}
		expectEntryIncludesLabels(entry, formattedActionTitle, developmentLabel);
		expect(entry.timelineKind).toBe('subaction');
		expect(entry.actionId).toBe(developActionId);
		const detailEntries = extractEntryItems(entry);
		const hasDevelopmentLine = detailEntries
			.map(extractEntryTitle)
			.some((detail) => detail.includes(developmentLabel));
		expect(hasDevelopmentLine).toBe(true);
	});

	it('logs royal decree develop once using develop action copy', () => {
		const selectedOption = actionInfo.options[0];
		if (!selectedOption) {
			throw new Error('Expected development option');
		}
		const { developmentId, actionId: developActionId } = selectedOption;
		const logLines = logContent('action', actionInfo.id, translationContext, {
			landId: 'A-L1',
			choices: {
				[actionInfo.developGroup.id ?? 'royal_decree_develop']: {
					optionId: selectedOption.optionId ?? 'royal_decree_option',
					params: {
						landId: 'A-L1',
						developmentId,
					},
				},
			},
		});
		const normalizedLines = logLines
			.map((line) => {
				if (typeof line === 'string') {
					return line;
				}
				if (typeof line.text === 'string') {
					return line.text;
				}
				if (typeof line.title === 'string') {
					return line.title;
				}
				return '';
			})
			.filter((line): line is string => line.length > 0);
		const formattedActionTitle = buildDevelopActionLabel(developActionId);
		const development = translationContext.developments.get(developmentId);
		if (!development) {
			throw new Error(`Missing development definition for ${developmentId}`);
		}
		const developmentLabel = buildDefinitionLabel(development, developmentId);
		const matchingLines = normalizedLines.filter((line) =>
			line.includes(formattedActionTitle),
		);
		expect(matchingLines.length).toBeLessThanOrEqual(1);
		if (matchingLines[0]) {
			expect(matchingLines[0]).toContain(developmentLabel);
		}
	});
});
