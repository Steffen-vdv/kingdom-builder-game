import { type ResourceKey } from '@kingdom-builder/contents';
import type {
	EngineContext,
	EffectDef,
	AttackOnDamageLogEntry,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import { summarizeEffects, describeEffects } from '../factory';
import { prefixOwnerSummary } from './attack/summary';
import {
	type AttackTargetFormatter,
	type Mode,
} from './attack/target-formatter';
import {
	resolveAttackFormatterContext,
	type AttackFormatterContext,
} from './attack/statContext';

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

export type BaseEntryResult = AttackFormatterContext & { entry: SummaryEntry };

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

// Attack summary strings must stay icon-based. Target formatters should call
// buildAttackSummaryBullet for the summarize branch instead of returning prose.
export function buildBaseEntry(
	effectDefinition: EffectDef<Record<string, unknown>>,
	mode: Mode,
): BaseEntryResult {
	const context = resolveAttackFormatterContext(effectDefinition);
	const ignoreAbsorption = Boolean(
		effectDefinition.params?.['ignoreAbsorption'],
	);
	const ignoreFortification = Boolean(
		effectDefinition.params?.['ignoreFortification'],
	);
	const entry = context.formatter.buildBaseEntry({
		mode,
		stats: context.stats,
		info: context.info,
		target: context.target,
		targetLabel: context.targetLabel,
		ignoreAbsorption,
		ignoreFortification,
	});
	return {
		entry,
		formatter: context.formatter,
		info: context.info,
		target: context.target,
		targetLabel: context.targetLabel,
		stats: context.stats,
	};
}

function applyOwnerPresentation(
	owner: 'attacker' | 'defender',
	entry: SummaryEntry,
	mode: Mode,
	suffix: string,
): SummaryEntry {
	if (mode === 'summarize') {
		return prefixOwnerSummary(owner, entry);
	}
	if (typeof entry === 'string') {
		return `${entry} ${suffix}`;
	}
	return { ...entry, title: `${entry.title} ${suffix}` };
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
		owner: 'attacker' | 'defender',
	) => {
		const suffix = owner === 'defender' ? 'for opponent' : 'for you';
		entries.forEach((entry, index) => {
			const definition = defs[index]!;
			const { actions, others } = categorizeDamageEffects(
				definition,
				entry,
				mode,
			);
			const formattedActions =
				mode === 'summarize'
					? actions.map((action) =>
							applyOwnerPresentation(owner, action, mode, suffix),
						)
					: actions;
			actionItems.push(...formattedActions);
			others.forEach((other) => {
				items.push(applyOwnerPresentation(owner, other, mode, suffix));
			});
		});
	};

	collect(defenderDefs, defenderEntries, 'defender');
	collect(attackerDefs, attackerEntries, 'attacker');

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
