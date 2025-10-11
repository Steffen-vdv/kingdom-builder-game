import { describe, expect, it, vi } from 'vitest';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	type DevelopmentDef,
} from '@kingdom-builder/contents';
import {
	describeContent,
	logContent,
	summarizeContent,
	type SummaryEntry,
} from '../src/translation';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const engineContext = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
const translationContext = createTranslationContextForEngine(engineContext);

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

function findSelfReferentialDevelopment(
	registry: Iterable<[string, DevelopmentDef]>,
): string {
	for (const [id, definition] of registry) {
		const values = definition as unknown as Record<string, unknown>;
		for (const value of Object.values(values)) {
			if (Array.isArray(value) && hasSelfEvaluator(value as EffectDef[])) {
				return id;
			}
		}
	}
	throw new Error('Expected development with self-referential evaluator');
}

describe('development translation', () => {
	it('replaces self-referential placeholders when describing developments', () => {
		const id = findSelfReferentialDevelopment(DEVELOPMENTS.entries());
		const summary = summarizeContent('development', id, translationContext);
		const description = describeContent('development', id, translationContext);
		const strings = [...flatten(summary), ...flatten(description)];

		expect(strings.some((line) => line.includes('$id'))).toBe(false);

		const definition = translationContext.developments.get(id);
		expect(definition).toBeDefined();
		const icon = definition?.icon || '';

		const hasIncomeLine = strings.some((line) => {
			return /Gain Income step/.test(line);
		});
		expect(hasIncomeLine).toBe(true);

		expect(strings.some((line) => /\+2/.test(line))).toBe(true);
		expect(strings.some((line) => /Gold/.test(line))).toBe(true);
		const prohibited = strings.filter(
			(line) =>
				line.includes(`per ${icon} ${definition?.name ?? ''}`) ||
				line.includes(`for each ${icon} ${definition?.name ?? ''}`),
		);
		expect(prohibited).toHaveLength(0);

		const logEntry = logContent('development', id, translationContext);
		expect(logEntry.some((line) => line.includes(definition?.name ?? ''))).toBe(
			true,
		);
		if (icon) {
			expect(logEntry.some((line) => line.includes(icon))).toBe(true);
		}
	});
});
