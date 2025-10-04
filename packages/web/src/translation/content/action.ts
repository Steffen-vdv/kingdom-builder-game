import { summarizeEffects, describeEffects, logEffects } from '../effects';
import type {
	EngineContext,
	ActionParams,
	ResolvedActionEffectChoice,
} from '@kingdom-builder/engine';
import { resolveActionEffects as resolveEffects } from '@kingdom-builder/engine';
import { registerContentTranslator } from './factory';
import type { ContentTranslator, Summary } from './types';
import { getActionLogHook } from './actionLogHooks';

function logChoiceLines(
	lines: string[],
	choices: ResolvedActionEffectChoice[],
): void {
	for (const choice of choices) {
		const optionLabel = choice.option.label ?? choice.optionId;
		const groupLabel = choice.group.label ?? choice.groupId;
		lines.push(`  Chose ${optionLabel} for ${groupLabel}`);
	}
}

class ActionTranslator
	implements ContentTranslator<string, Record<string, unknown>>
{
	summarize(
		id: string,
		ctx: EngineContext,
		opts?: Record<string, unknown>,
	): Summary {
		const def = ctx.actions.get(id);
		const resolved = resolveEffects(
			def.effects,
			opts as ActionParams<string> | undefined,
		);
		const eff = summarizeEffects(resolved.effects, ctx);
		return eff.length ? eff : [];
	}
	describe(
		id: string,
		ctx: EngineContext,
		opts?: Record<string, unknown>,
	): Summary {
		const def = ctx.actions.get(id);
		const resolved = resolveEffects(
			def.effects,
			opts as ActionParams<string> | undefined,
		);
		const eff = describeEffects(resolved.effects, ctx);
		return eff.length ? eff : [];
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
		const resolved = resolveEffects(
			def.effects,
			params as ActionParams<string> | undefined,
		);
		const effLogs = logEffects(resolved.effects, ctx);
		const lines = [message];
		if (resolved.choices.length) {
			logChoiceLines(lines, resolved.choices);
		}
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
