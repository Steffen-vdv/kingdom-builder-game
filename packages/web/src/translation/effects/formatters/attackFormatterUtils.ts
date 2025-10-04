import { STATS, Stat, type ResourceKey } from '@kingdom-builder/contents';
import type {
	EngineContext,
	EffectDef,
	AttackOnDamageLogEntry,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import { summarizeEffects, describeEffects } from '../factory';
import {
	resolveAttackTargetFormatter,
	type AttackTargetFormatter,
	type TargetInfo,
	type AttackTarget,
	type Mode,
} from './attack/target-formatter';

type DamageEffectCategorizer = (
	item: SummaryEntry,
	mode: Mode,
) => SummaryEntry[];

const DAMAGE_EFFECT_CATEGORIES: Record<string, DamageEffectCategorizer> = {
	'action:perform': (item, mode) => [
		mode === 'summarize' && typeof item !== 'string'
			? (item as { title: string }).title
			: item,
	],
};

export type BaseEntryResult = {
	entry: SummaryEntry;
	formatter: AttackTargetFormatter;
	info: TargetInfo;
	target: AttackTarget;
	targetLabel: string;
};

export function categorizeDamageEffects(
	effectDefinition: EffectDef,
	item: SummaryEntry,
	mode: Mode,
): { actions: SummaryEntry[]; others: SummaryEntry[] } {
	const key = `${effectDefinition.type}:${effectDefinition.method}`;
	const handler = DAMAGE_EFFECT_CATEGORIES[key];
	if (handler) {
		return { actions: handler(item, mode), others: [] };
	}
	return { actions: [], others: [item] };
}

export function ownerLabel(owner: 'attacker' | 'defender'): string {
	return owner === 'attacker' ? 'You' : 'Opponent';
}

export function buildBaseEntry(
	effectDefinition: EffectDef<Record<string, unknown>>,
	mode: Mode,
): BaseEntryResult {
	const army = STATS[Stat.armyStrength];
	const absorption = STATS[Stat.absorption];
	const fort = STATS[Stat.fortificationStrength];
	const { formatter, target, info, targetLabel } =
		resolveAttackTargetFormatter(effectDefinition);
	const ignoreAbsorption = Boolean(
		effectDefinition.params?.['ignoreAbsorption'],
	);
	const ignoreFortification = Boolean(
		effectDefinition.params?.['ignoreFortification'],
	);
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

export function summarizeOnDamage(
	effectDefinition: EffectDef<Record<string, unknown>>,
	ctx: EngineContext,
	mode: Mode,
	baseEntry: BaseEntryResult,
): SummaryEntry | null {
	const onDamage = effectDefinition.params?.['onDamage'] as
		| { attacker?: EffectDef[]; defender?: EffectDef[] }
		| undefined;
	if (!onDamage) {
		return null;
	}
	const { formatter, info, target, targetLabel } = baseEntry;
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
			const definition = defs[index]!;
			const { actions, others } = categorizeDamageEffects(
				definition,
				entry,
				mode,
			);
			actionItems.push(...actions);
			others.forEach((other) => {
				if (typeof other === 'string') {
					items.push(`${other} ${suffix}`);
				} else {
					items.push({
						...other,
						title: `${other.title} ${suffix}`,
					});
				}
			});
		});
	};

	collect(defenderDefs, defenderEntries, 'for opponent');
	collect(attackerDefs, attackerEntries, 'for you');

	const combined = items.concat(actionItems);
	if (!combined.length) {
		return null;
	}
	return {
		title: formatter.buildOnDamageTitle(mode, {
			info,
			target,
			targetLabel,
		}),
		items: combined,
	};
}

export function formatDiffEntries(
	entry: AttackOnDamageLogEntry,
	formatter: AttackTargetFormatter,
): SummaryEntry[] {
	const parts: SummaryEntry[] = [];
	entry.defender.forEach((diff) =>
		parts.push(formatter.formatDiff(ownerLabel('defender'), diff)),
	);
	entry.attacker.forEach((diff) =>
		parts.push(formatter.formatDiff(ownerLabel('attacker'), diff)),
	);
	return parts;
}

export function collectTransferPercents(
	effects: EffectDef[] | undefined,
	transferPercents: Map<ResourceKey, number>,
): void {
	if (!effects) {
		return;
	}
	for (const effectDefinition of effects) {
		if (
			effectDefinition.type === 'resource' &&
			effectDefinition.method === 'transfer' &&
			effectDefinition.params
		) {
			const key =
				(effectDefinition.params['key'] as ResourceKey | undefined) ??
				undefined;
			const percent = effectDefinition.params['percent'] as number | undefined;
			if (key && percent !== undefined && !transferPercents.has(key)) {
				transferPercents.set(key, percent);
			}
		}
		if (Array.isArray(effectDefinition.effects)) {
			const nestedEffects = effectDefinition.effects;
			collectTransferPercents(nestedEffects, transferPercents);
		}
	}
}
