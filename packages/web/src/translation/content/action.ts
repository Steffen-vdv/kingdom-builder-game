import {
	coerceActionEffectGroupChoices,
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
import type { ContentTranslator, Summary } from './types';
import { getActionLogHook } from './actionLogHooks';

class ActionTranslator
	implements ContentTranslator<string, Record<string, unknown>>
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
		const eff = summarizeEffects(resolved.effects, ctx);
		const groups = formatEffectGroups(
			resolved.groups.map((group) => group.group),
			'summarize',
		);
		const combined = [...eff, ...groups];
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
		const eff = describeEffects(resolved.effects, ctx);
		const groups = formatEffectGroups(
			resolved.groups.map((group) => group.group),
			'describe',
		);
		const combined = [...eff, ...groups];
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
		const choiceMap = coerceActionEffectGroupChoices(params?.['choices']);
		const effLogs = [
			...logEffects(resolved.effects, ctx),
			...formatEffectGroups(
				resolved.groups.map((group) => group.group),
				'log',
				choiceMap,
			),
		];
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
