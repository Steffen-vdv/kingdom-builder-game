import { type ResourceKey } from '@kingdom-builder/contents';
import type {
	AttackLog,
	AttackOnDamageLogEntry,
	EffectDef,
} from '@kingdom-builder/protocol';
import type { SummaryEntry } from '../../content';
import { registerEffectFormatter } from '../factory';
import {
	buildBaseEntry,
	summarizeOnDamage,
	formatDiffEntries,
	ownerLabel,
	collectTransferPercents,
} from './attackFormatterUtils';
import {
	resolveAttackFormatterContext,
	type AttackFormatterContext,
} from './attack/statContext';
import {
	resolveAttackTargetFormatter,
	type AttackTargetFormatter,
} from './attack/target-formatter';
import type { TranslationContext } from '../../context';

type AttackOnDamageFormatterArgs = {
	entry: AttackOnDamageLogEntry;
	translationContext: TranslationContext;
	formatter: AttackTargetFormatter;
};

type AttackOnDamageFormatter = (
	args: AttackOnDamageFormatterArgs,
) => SummaryEntry[];

const onDamageFormatterRegistry = new Map<string, AttackOnDamageFormatter>();

export function registerAttackOnDamageFormatter(
	type: string,
	method: string,
	handler: AttackOnDamageFormatter,
): void {
	onDamageFormatterRegistry.set(`${type}:${method}`, handler);
}

function resolveAttackOnDamageFormatter(
	entry: AttackOnDamageLogEntry,
): AttackOnDamageFormatter | undefined {
	return onDamageFormatterRegistry.get(
		`${entry.effect.type}:${entry.effect.method}`,
	);
}

function fallbackLog(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
): SummaryEntry[] {
	const baseEntry = buildBaseEntry(effectDefinition, 'describe');
	const onDamage = summarizeOnDamage(
		effectDefinition,
		translationContext,
		'describe',
		baseEntry,
	);
	const parts: SummaryEntry[] = [baseEntry.entry];
	if (onDamage) {
		parts.push(onDamage);
	}
	return parts;
}

function buildEvaluationEntry(
	log: AttackLog['evaluation'],
	context: AttackFormatterContext,
): SummaryEntry {
	return context.formatter.buildEvaluationEntry(log, {
		stats: context.stats,
		info: context.info,
		target: context.target,
		targetLabel: context.targetLabel,
	});
}

function buildActionLog(
	entry: AttackOnDamageLogEntry,
	translationContext: TranslationContext,
	formatter: AttackTargetFormatter,
): SummaryEntry {
	const id = entry.effect.params?.['id'] as string | undefined;
	let icon = '';
	let name = id || 'Unknown action';
	const transferPercents = new Map<ResourceKey, number>();
	if (id) {
		try {
			const definition = translationContext.actions.get(id);
			icon = definition.icon || '';
			name = definition.name;
			collectTransferPercents(
				definition.effects as EffectDef[] | undefined,
				transferPercents,
			);
		} catch {
			/* ignore missing action */
		}
	}
	const items: SummaryEntry[] = [];
	entry.defender.forEach((diff) => {
		const percent =
			diff.type === 'resource'
				? transferPercents.get(diff.key as ResourceKey)
				: undefined;
		items.push(
			formatter.formatDiff(
				ownerLabel(translationContext, 'defender'),
				diff,
				percent !== undefined ? { percent } : { showPercent: true as const },
			),
		);
	});
	entry.attacker.forEach((diff) => {
		items.push(
			formatter.formatDiff(ownerLabel(translationContext, 'attacker'), diff),
		);
	});
	return { title: `Trigger ${icon} ${name}`.trim(), items };
}

export function buildOnDamageEntry(
	logEntries: AttackLog['onDamage'],
	translationContext: TranslationContext,
	effectDefinition: EffectDef<Record<string, unknown>>,
): SummaryEntry | null {
	if (!logEntries.length) {
		return null;
	}
	const { formatter, info, target } =
		resolveAttackTargetFormatter(effectDefinition);
	const items: SummaryEntry[] = [];
	const defenderEntries = logEntries.filter(
		(entry) => entry.owner === 'defender',
	);
	const attackerEntries = logEntries.filter(
		(entry) => entry.owner === 'attacker',
	);
	const ordered = defenderEntries.concat(attackerEntries);
	for (const entry of ordered) {
		const handler = resolveAttackOnDamageFormatter(entry);
		const formatted = handler
			? handler({ entry, translationContext, formatter })
			: formatDiffEntries(entry, formatter, translationContext);
		items.push(...formatted);
	}
	if (!items.length) {
		return null;
	}
	return {
		title: formatter.onDamageLogTitle(info, target),
		items,
	};
}

registerAttackOnDamageFormatter(
	'action',
	'perform',
	({ entry, translationContext, formatter }) => [
		buildActionLog(entry, translationContext, formatter),
	],
);

registerAttackOnDamageFormatter(
	'resource',
	'transfer',
	({ entry, translationContext, formatter }) => {
		const percent = entry.effect.params
			? (entry.effect.params['percent'] as number | undefined)
			: undefined;
		if (percent === undefined) {
			return formatDiffEntries(entry, formatter, translationContext);
		}
		const parts: SummaryEntry[] = [];
		entry.defender.forEach((diff) => {
			parts.push(
				formatter.formatDiff(ownerLabel(translationContext, 'defender'), diff, {
					percent,
				}),
			);
		});
		entry.attacker.forEach((diff) => {
			parts.push(
				formatter.formatDiff(ownerLabel(translationContext, 'attacker'), diff),
			);
		});
		return parts;
	},
);

registerEffectFormatter('attack', 'perform', {
	summarize: (effect, translationContext) => {
		const baseEntry = buildBaseEntry(effect, 'summarize');
		const parts: SummaryEntry[] = [baseEntry.entry];
		const onDamage = summarizeOnDamage(
			effect,
			translationContext,
			'summarize',
			baseEntry,
		);
		if (onDamage) {
			parts.push(onDamage);
		}
		return parts;
	},
	describe: (effect, translationContext) => {
		const baseEntry = buildBaseEntry(effect, 'describe');
		const parts: SummaryEntry[] = [baseEntry.entry];
		const onDamage = summarizeOnDamage(
			effect,
			translationContext,
			'describe',
			baseEntry,
		);
		if (onDamage) {
			parts.push(onDamage);
		}
		return parts;
	},
	log: (effect, translationContext) => {
		const log = translationContext.pullEffectLog<AttackLog>('attack:perform');
		if (!log) {
			return fallbackLog(effect, translationContext);
		}
		const contextDetails = resolveAttackFormatterContext(effect);
		const entries: SummaryEntry[] = [
			buildEvaluationEntry(log.evaluation, contextDetails),
		];
		const onDamage = buildOnDamageEntry(
			log.onDamage,
			translationContext,
			effect,
		);
		if (onDamage) {
			entries.push(onDamage);
		}
		return entries;
	},
});
