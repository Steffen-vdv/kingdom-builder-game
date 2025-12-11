import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import {
	describeContent,
	logContent,
	summarizeContent,
	type SummaryEntry,
} from '../src/translation';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

interface SelfReferentialDevelopment {
	id: string;
	resourceKeys: Set<string>;
}

function flatten(entries: SummaryEntry[]): string[] {
	const result: string[] = [];
	for (const entry of entries) {
		if (typeof entry === 'string') {
			result.push(entry);
		} else {
			result.push(entry.title);
			result.push(...flatten(entry.items));
		}
	}
	return result;
}

function hasSelfEvaluator(effects: EffectDef[] | undefined): boolean {
	if (!effects) {
		return false;
	}
	for (const effect of effects) {
		const params = effect.evaluator?.params as
			| Record<string, unknown>
			| undefined;
		if (effect.evaluator?.type === 'development' && params?.['id'] === '$id') {
			return true;
		}
		if (hasSelfEvaluator(effect.effects as EffectDef[] | undefined)) {
			return true;
		}
	}
	return false;
}

function collectResourceKeys(
	effects: EffectDef[] | undefined,
	keys: Set<string>,
): void {
	if (!effects) {
		return;
	}
	for (const effect of effects) {
		if (
			effect.type === 'resource' &&
			effect.method === 'add' &&
			typeof effect.params === 'object' &&
			effect.params !== null
		) {
			// format: resourceId instead of key
			const params = effect.params as { key?: string; resourceId?: string };
			if (typeof params.resourceId === 'string') {
				keys.add(params.resourceId);
			}
		}
		collectResourceKeys(effect.effects as EffectDef[] | undefined, keys);
	}
}

function findSelfReferentialDevelopment(
	registry: Iterable<readonly [string, Record<string, unknown>]>,
): SelfReferentialDevelopment {
	for (const [id, definition] of registry) {
		if (typeof definition !== 'object' || definition === null) {
			continue;
		}
		for (const value of Object.values(definition)) {
			if (!Array.isArray(value)) {
				continue;
			}
			const effects = value as EffectDef[];
			if (hasSelfEvaluator(effects)) {
				const resourceKeys = new Set<string>();
				collectResourceKeys(effects, resourceKeys);
				return { id, resourceKeys };
			}
		}
	}
	throw new Error('Expected development with self-referential evaluator');
}

describe('development translation', () => {
	it('replaces self-referential placeholders when describing developments', () => {
		const { translationContext, registries } =
			buildSyntheticTranslationContext();
		const { id, resourceKeys } = findSelfReferentialDevelopment(
			registries.developments.entries(),
		);
		const summary = summarizeContent('development', id, translationContext);
		const description = describeContent('development', id, translationContext);
		const summaryAgain = summarizeContent(
			'development',
			id,
			translationContext,
		);
		const strings = [
			...flatten(summary),
			...flatten(description),
			...flatten(summaryAgain),
		];

		expect(strings.some((line) => line.includes('$id'))).toBe(false);

		const definition = translationContext.developments.get(id);
		expect(definition).toBeDefined();
		const developmentName = definition?.name ?? id;
		const icon = definition?.icon ?? '';

		// Check for income-related trigger text in any of its forms:
		// - "Gain Income" (legacy)
		// - "On your Income step" (trigger text)
		// - "Income" (trigger label)
		// - "onGainIncomeStep" (fallback ID)
		const hasIncomeLine = strings.some((line) => {
			return (
				/Gain Income/u.test(line) ||
				/On your Income step/u.test(line) ||
				/\bIncome\b/u.test(line) ||
				line.includes('onGainIncomeStep')
			);
		});
		expect(hasIncomeLine).toBe(true);

		expect(strings.some((line) => /\+2/u.test(line))).toBe(true);
		const [resourceKey] = [...resourceKeys];
		if (resourceKey) {
			// Use metadata for resource label lookup (matches formatter behavior)
			const metadata = translationContext.resourceMetadata.get(resourceKey);
			const resourceLabel = metadata.label ?? resourceKey;
			expect(strings.some((line) => line.includes(resourceLabel))).toBe(true);
		}
		const prohibited = strings.filter((line) => {
			return (
				icon.length > 0 &&
				(line.includes(`per ${icon} ${developmentName}`) ||
					line.includes(`for each ${icon} ${developmentName}`))
			);
		});
		expect(prohibited).toHaveLength(0);

		const logEntry = logContent('development', id, translationContext);
		expect(logEntry.some((line) => line.includes(developmentName))).toBe(true);
		if (icon) {
			expect(logEntry.some((line) => line.includes(icon))).toBe(true);
		}
	});

	it('falls back to development labels when icons are undefined', () => {
		let target: SelfReferentialDevelopment | undefined;
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				const info = findSelfReferentialDevelopment(
					registries.developments.entries(),
				);
				target = info;
				const development = registries.developments.get(info.id);
				if (development) {
					delete (development as { icon?: string }).icon;
				}
				if (!session.metadata.developments) {
					session.metadata.developments = {};
				}
				delete session.metadata.developments[info.id];
			},
		);
		if (!target) {
			throw new Error('Expected target development');
		}
		const summary = summarizeContent(
			'development',
			target.id,
			translationContext,
		);
		const description = describeContent(
			'development',
			target.id,
			translationContext,
		);
		const lines = [...flatten(summary), ...flatten(description)];
		expect(lines.some((line) => /undefined/u.test(line))).toBe(false);
		const development = translationContext.developments.get(target.id);
		const developmentName = development.name ?? target.id;
		const logLines = logContent('development', target.id, translationContext);
		const containsDevelopmentName = logLines.some((entry) => {
			const text = typeof entry === 'string' ? entry : entry.text;
			return text?.includes(developmentName) ?? false;
		});
		expect(containsDevelopmentName).toBe(true);
	});
});
