import { describe, expect, it, vi } from 'vitest';
import {
	createEngine,
	type EffectDef,
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
	type DevelopmentDef,
} from '@kingdom-builder/contents';
import {
	describeContent,
	logContent,
	summarizeContent,
	type SummaryEntry,
} from '../src/translation';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const ctx = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});

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
	for (const [id, def] of registry) {
		const values = def as unknown as Record<string, unknown>;
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
		const summary = summarizeContent('development', id, ctx as EngineContext);
		const description = describeContent(
			'development',
			id,
			ctx as EngineContext,
		);
		const strings = [...flatten(summary), ...flatten(description)];

		expect(strings.some((line) => line.includes('$id'))).toBe(false);

		const def = ctx.developments.get(id);
		const icon = def.icon || '';

		const hasIncomeLine = strings.some((line) => {
			return /Gain Income step/.test(line);
		});
		expect(hasIncomeLine).toBe(true);

		expect(strings.some((line) => /\+2/.test(line))).toBe(true);
		expect(strings.some((line) => /Gold/.test(line))).toBe(true);
		const prohibited = strings.filter(
			(line) =>
				line.includes(`per ${icon} ${def.name}`) ||
				line.includes(`for each ${icon} ${def.name}`),
		);
		expect(prohibited).toHaveLength(0);

		const logEntry = logContent('development', id, ctx as EngineContext);
		expect(logEntry.some((line) => line.includes(def.name))).toBe(true);
		if (icon) {
			expect(logEntry.some((line) => line.includes(icon))).toBe(true);
		}
	});
});
