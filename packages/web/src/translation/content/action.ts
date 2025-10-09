import {
	resolveActionEffects,
	type ActionParametersPayload,
} from '@kingdom-builder/protocol';
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
		context: TranslationContext,
		options?: Record<string, unknown>,
	): Summary {
		const definition = context.actions.get(id);
		const resolved = resolveActionEffects(
			definition,
			options as ActionParametersPayload | undefined,
		);
		const combined: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				combined.push(...summarizeEffects(step.effects, context));
				continue;
			}
			combined.push(...formatEffectGroups([step], 'summarize', context));
		}
		return combined.length ? combined : [];
	}
	describe(
		id: string,
		context: TranslationContext,
		options?: Record<string, unknown>,
	): Summary {
		const definition = context.actions.get(id);
		const resolved = resolveActionEffects(
			definition,
			options as ActionParametersPayload | undefined,
		);
		const combined: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				combined.push(...describeEffects(step.effects, context));
				continue;
			}
			combined.push(...formatEffectGroups([step], 'describe', context));
		}
		return combined.length ? combined : [];
	}
	log(
		id: string,
		context: TranslationContext,
		params?: Record<string, unknown>,
	): ActionLogLineDescriptor[] {
		const definition = context.actions.get(id);
		const icon = definition.icon?.trim();
		const label = definition.name.trim();
		let message = icon ? `${icon} ${label}` : label;
		const extra = getActionLogHook(definition)?.(context, params);
		if (extra) {
			message += extra;
		}
		const resolved = resolveActionEffects(
			definition,
			params as ActionParametersPayload | undefined,
		);
		const effectLogs: Summary = [];
		for (const step of resolved.steps) {
			if (step.type === 'effects') {
				effectLogs.push(...logEffects(step.effects, context));
				continue;
			}
			effectLogs.push(...formatEffectGroups([step], 'log', context));
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
		effectLogs.forEach((entry) => push(entry, 1));
		return lines;
	}
}

registerContentTranslator('action', new ActionTranslator());
