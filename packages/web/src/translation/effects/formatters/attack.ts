import { STATS, Stat, type ResourceKey } from '@kingdom-builder/contents';
import type {
	AttackLog,
	AttackOnDamageLogEntry,
	EngineContext,
	EffectDef,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import {
	resolveAttackTargetFormatter,
	resolveAttackTargetFormatterFromLogTarget,
	type AttackTarget,
	type AttackTargetFormatter,
	type TargetInfo,
	type Mode,
} from './attack/target-formatter';

const DAMAGE_EFFECT_CATEGORIES: Record<
	string,
	(item: SummaryEntry, mode: Mode) => SummaryEntry[]
> = {
	'action:perform': (item, mode) => [
		mode === 'summarize' && typeof item !== 'string'
			? (item as { title: string }).title
			: item,
	],
};

type BaseEntryResult = {
	entry: SummaryEntry;
	formatter: AttackTargetFormatter;
	info: TargetInfo;
	target: AttackTarget;
	targetLabel: string;
};

function categorizeDamageEffects(
	def: EffectDef,
	item: SummaryEntry,
	mode: Mode,
): { actions: SummaryEntry[]; others: SummaryEntry[] } {
	const key = `${def.type}:${def.method}`;
	const handler = DAMAGE_EFFECT_CATEGORIES[key];
	if (handler) return { actions: handler(item, mode), others: [] };
	return { actions: [], others: [item] };
}

function ownerLabel(owner: 'attacker' | 'defender') {
	return owner === 'attacker' ? 'You' : 'Opponent';
}

function buildBaseEntry(
	eff: EffectDef<Record<string, unknown>>,
	mode: Mode,
): BaseEntryResult {
	const army = STATS[Stat.armyStrength];
	const absorption = STATS[Stat.absorption];
	const fort = STATS[Stat.fortificationStrength];
	const { formatter, target, info, targetLabel } =
		resolveAttackTargetFormatter(eff);
	const ignoreAbsorption = Boolean(eff.params?.['ignoreAbsorption']);
	const ignoreFortification = Boolean(eff.params?.['ignoreFortification']);
	const entry = formatter.buildBaseEntry({
		mode,
		army,
		absorption,
		fort,
		info,
		target,
		targetLabel,
		ignoreAbsorption,
		ignoreFortification,
	});
	return { entry, formatter, info, target, targetLabel };
}

function summarizeOnDamage(
	eff: EffectDef<Record<string, unknown>>,
	ctx: EngineContext,
	mode: Mode,
	base: BaseEntryResult,
): SummaryEntry | null {
	const onDamage = eff.params?.['onDamage'] as
		| { attacker?: EffectDef[]; defender?: EffectDef[] }
		| undefined;
	if (!onDamage) return null;
	const { formatter, info, target, targetLabel } = base;
	const format = mode === 'summarize' ? summarizeEffects : describeEffects;
	const attackerDefs = onDamage.attacker ?? [];
	const defenderDefs = onDamage.defender ?? [];
	const attackerEntries = format(attackerDefs, ctx);
	const defenderEntries = format(defenderDefs, ctx);
	const items: SummaryEntry[] = [];
	const actionItems: SummaryEntry[] = [];

	const collect = (
		defs: EffectDef[],
		entries: SummaryEntry[],
		suffix: string,
	) => {
		entries.forEach((entry, index) => {
			const def = defs[index]!;
			const { actions, others } = categorizeDamageEffects(def, entry, mode);
			actionItems.push(...actions);
			others.forEach((other) => {
				if (typeof other === 'string') items.push(`${other} ${suffix}`);
				else items.push({ ...other, title: `${other.title} ${suffix}` });
			});
		});
	};

	collect(defenderDefs, defenderEntries, 'for opponent');
	collect(attackerDefs, attackerEntries, 'for you');

	const combined = items.concat(actionItems);
	if (!combined.length) return null;
	return {
		title: formatter.buildOnDamageTitle(mode, { info, target, targetLabel }),
		items: combined,
	};
}

function fallbackLog(
	eff: EffectDef<Record<string, unknown>>,
	ctx: EngineContext,
): SummaryEntry[] {
	const base = buildBaseEntry(eff, 'describe');
	const onDamage = summarizeOnDamage(eff, ctx, 'describe', base);
	const parts: SummaryEntry[] = [base.entry];
	if (onDamage) parts.push(onDamage);
	return parts;
}

function buildEvaluationEntry(log: AttackLog['evaluation']): SummaryEntry {
	const { formatter, info, target, targetLabel } =
		resolveAttackTargetFormatterFromLogTarget(log.target);
	const army = STATS[Stat.armyStrength];
	const absorption = STATS[Stat.absorption];
	const fort = STATS[Stat.fortificationStrength];
	return formatter.buildEvaluationEntry(log, {
		army,
		absorption,
		fort,
		info,
		target,
		targetLabel,
	});
}

function buildActionLog(
	entry: AttackOnDamageLogEntry,
	ctx: EngineContext,
	formatter: AttackTargetFormatter,
): SummaryEntry {
	const id = entry.effect.params?.['id'] as string | undefined;
	let icon = '';
	let name = id || 'Unknown action';
	const transferPercents = new Map<ResourceKey, number>();
	if (id)
		try {
			const def = ctx.actions.get(id);
			icon = def.icon || '';
			name = def.name;
			const walk = (effects: EffectDef[] | undefined) => {
				if (!effects) return;
				for (const eff of effects) {
					if (
						eff.type === 'resource' &&
						eff.method === 'transfer' &&
						eff.params
					) {
						const key =
							(eff.params['key'] as ResourceKey | undefined) ?? undefined;
						const pct = eff.params['percent'] as number | undefined;
						if (key && pct !== undefined && !transferPercents.has(key))
							transferPercents.set(key, pct);
					}
					if (Array.isArray(eff.effects))
						walk(eff.effects as EffectDef[] | undefined);
				}
			};
			walk(def.effects as EffectDef[] | undefined);
		} catch {
			/* ignore missing action */
		}
	const items: SummaryEntry[] = [];
	entry.defender.forEach((diff) => {
		const percent =
			diff.type === 'resource'
				? transferPercents.get(diff.key as ResourceKey)
				: undefined;
		items.push(
			formatter.formatDiff(
				ownerLabel('defender'),
				diff,
				percent !== undefined ? { percent } : { showPercent: true as const },
			),
		);
	});
	entry.attacker.forEach((diff) =>
		items.push(formatter.formatDiff(ownerLabel('attacker'), diff)),
	);
	return { title: `Triggered ${icon} ${name}`.trim(), items };
}

function buildOnDamageEntry(
	logEntries: AttackLog['onDamage'],
	ctx: EngineContext,
	eff: EffectDef<Record<string, unknown>>,
): SummaryEntry | null {
	if (!logEntries.length) return null;
	const { formatter, info, target } = resolveAttackTargetFormatter(eff);
	const items: SummaryEntry[] = [];
	const defenderEntries = logEntries.filter(
		(entry) => entry.owner === 'defender',
	);
	const attackerEntries = logEntries.filter(
		(entry) => entry.owner === 'attacker',
	);
	const ordered = defenderEntries.concat(attackerEntries);
	for (const entry of ordered) {
		if (entry.effect.type === 'action' && entry.effect.method === 'perform') {
			items.push(buildActionLog(entry, ctx, formatter));
			continue;
		}
		const percent =
			entry.effect.type === 'resource' &&
			entry.effect.method === 'transfer' &&
			entry.effect.params
				? (entry.effect.params['percent'] as number | undefined)
				: undefined;
		entry.defender.forEach((diff) => {
			if (percent !== undefined)
				items.push(
					formatter.formatDiff(ownerLabel('defender'), diff, { percent }),
				);
			else items.push(formatter.formatDiff(ownerLabel('defender'), diff));
		});
		entry.attacker.forEach((diff) =>
			items.push(formatter.formatDiff(ownerLabel('attacker'), diff)),
		);
	}
	if (!items.length) return null;
	return {
		title: formatter.onDamageLogTitle(info, target),
		items,
	};
}

registerEffectFormatter('attack', 'perform', {
	summarize: (eff, ctx) => {
		const base = buildBaseEntry(eff, 'summarize');
		const parts: SummaryEntry[] = [base.entry];
		const onDamage = summarizeOnDamage(eff, ctx, 'summarize', base);
		if (onDamage) parts.push(onDamage);
		return parts;
	},
	describe: (eff, ctx) => {
		const base = buildBaseEntry(eff, 'describe');
		const parts: SummaryEntry[] = [base.entry];
		const onDamage = summarizeOnDamage(eff, ctx, 'describe', base);
		if (onDamage) parts.push(onDamage);
		return parts;
	},
	log: (eff, ctx) => {
		const log = ctx.pullEffectLog<AttackLog>('attack:perform');
		if (!log) return fallbackLog(eff, ctx);
		const entries: SummaryEntry[] = [buildEvaluationEntry(log.evaluation)];
		const onDamage = buildOnDamageEntry(log.onDamage, ctx, eff);
		if (onDamage) entries.push(onDamage);
		return entries;
	},
});
