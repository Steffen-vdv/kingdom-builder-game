import {
	resolveActionEffects,
	type ActionParams,
	type EngineContext,
} from '@kingdom-builder/engine';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
	formatEffectGroups,
} from '../effects';
import { registerContentTranslator } from './factory';
import type { LegacyContentTranslator, Summary } from './types';
import { getActionLogHook } from './actionLogHooks';

class ActionTranslator
	implements LegacyContentTranslator<string, Record<string, unknown>>
{
	summarize(
		id: string,
		ctx: EngineContext,
		opts?: Record<string, unknown>,
	): Summary {
		const def = ctx.actions.get(id);
		const resolved = resolveActionEffects(
			def,
			opts as ActionParams<string> | undefined,
		);
		const combined: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				combined.push(...summarizeEffects(step.effects, ctx));
				continue;
			}
			combined.push(...formatEffectGroups([step], 'summarize', ctx));
		}
		return combined.length ? combined : [];
	}
	describe(
		id: string,
		ctx: EngineContext,
		opts?: Record<string, unknown>,
	): Summary {
		const def = ctx.actions.get(id);
		const resolved = resolveActionEffects(
			def,
			opts as ActionParams<string> | undefined,
		);
		const combined: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				combined.push(...describeEffects(step.effects, ctx));
				continue;
			}
			combined.push(...formatEffectGroups([step], 'describe', ctx));
		}
		return combined.length ? combined : [];
	}
	log(
		id: string,
		ctx: EngineContext,
		params?: Record<string, unknown>,
	): string[] {
		const def = ctx.actions.get(id);
		const icon = def.icon || '';
		const label = def.name;
		let message = `Played ${icon} ${label}`;
		const extra = getActionLogHook(def)?.(ctx, params);
		if (extra) {
			message += extra;
		}
		const resolved = resolveActionEffects(
			def,
			params as ActionParams<string> | undefined,
		);
		const effLogs: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				effLogs.push(...logEffects(step.effects, ctx));
				continue;
			}
			effLogs.push(...formatEffectGroups([step], 'log', ctx));
		}
		const lines = [message];
		function push(entry: unknown, depth: number) {
			if (typeof entry === 'string') {
				lines.push(`${'  '.repeat(depth)}${entry}`);
			} else if (entry && typeof entry === 'object') {
				const e = entry as { title: string; items: unknown[] };
				lines.push(`${'  '.repeat(depth)}${e.title}`);
				e.items.forEach((i) => push(i, depth + 1));
			}
		}
		effLogs.forEach((e) => push(e, 1));
		return lines;
	}
}

registerContentTranslator('action', new ActionTranslator());
