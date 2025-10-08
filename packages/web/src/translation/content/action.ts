import {
	resolveActionEffects,
	type ActionParams,
} from '@kingdom-builder/engine';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
	formatEffectGroups,
} from '../effects';
import { registerContentTranslator } from './factory';
import type {
	ContentTranslator,
	Summary,
	SummaryEntry,
	SummaryGroup,
} from './types';
import type { TranslationContext } from '../context';
import { getActionLogHook } from './actionLogHooks';
import type {
	ActionLogLineDescriptor,
	ActionLogLineKind,
} from '../log/timeline';

class ActionTranslator
	implements ContentTranslator<string, Record<string, unknown>>
{
	summarize(
		id: string,
		ctx: TranslationContext,
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
		ctx: TranslationContext,
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
		ctx: TranslationContext,
		params?: Record<string, unknown>,
	): ActionLogLineDescriptor[] {
		const def = ctx.actions.get(id);
		const icon = def.icon?.trim();
		const label = def.name.trim();
		let message = icon ? `${icon} ${label}` : label;
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
		const lines: ActionLogLineDescriptor[] = [
			{ text: message, depth: 0, kind: 'headline' },
		];
		function push(
			entry: SummaryEntry,
			depth: number,
			fallbackKind: ActionLogLineKind = 'effect',
		): void {
			if (typeof entry === 'string') {
				const text = entry.trim();
				if (!text) {
					return;
				}
				lines.push({ text, depth, kind: fallbackKind });
				return;
			}
			const group = entry as SummaryGroup & {
				timelineKind?: ActionLogLineKind;
				actionId?: string;
			};
			const title = group.title?.trim();
			if (title) {
				const kind = group.timelineKind ?? 'group';
				const refId =
					typeof group.actionId === 'string' ? group.actionId : undefined;
				lines.push({
					text: title,
					depth,
					kind,
					...(refId ? { refId } : {}),
				});
			}
			const childItems = group.items;
			if (Array.isArray(childItems)) {
				for (const item of childItems) {
					const nextKind =
						group.timelineKind === 'subaction' ? 'effect' : fallbackKind;
					push(item, depth + 1, nextKind);
				}
			}
		}
		effLogs.forEach((entry) => push(entry, 1));
		return lines;
	}
}

registerContentTranslator('action', new ActionTranslator());
