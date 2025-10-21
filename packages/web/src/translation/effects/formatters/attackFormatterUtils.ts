import type {
	AttackOnDamageLogEntry,
	EffectDef,
} from '@kingdom-builder/protocol';
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
import type { TranslationContext } from '../../context';

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

function fallbackName(name: string | undefined, fallback: string): string {
	if (!name) {
		return fallback;
	}
	const trimmed = name.trim();
	return trimmed.length > 0 ? trimmed : fallback;
}

export function ownerLabel(
	translationContext: TranslationContext,
	owner: 'attacker' | 'defender',
): string {
	if (owner === 'attacker') {
		return fallbackName(translationContext.activePlayer.name, 'Player');
	}
	return fallbackName(translationContext.opponent.name, 'Opponent');
}

// Attack summary strings must stay icon-based. Target formatters should call
// buildAttackSummaryBullet for the summarize branch instead of returning prose.
export function buildBaseEntry(
	effectDefinition: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
	mode: Mode,
): BaseEntryResult {
	const context = resolveAttackFormatterContext(
		effectDefinition,
		translationContext,
	);
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
	translationContext: TranslationContext,
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
	const attackerEffectDefinitions = onDamage.attacker ?? [];
	const defenderEffectDefinitions = onDamage.defender ?? [];
	const attackerEntries = format(attackerEffectDefinitions, translationContext);
	const defenderEntries = format(defenderEffectDefinitions, translationContext);
	const formattedItems: SummaryEntry[] = [];
	const formattedActionItems: SummaryEntry[] = [];

	const attackerName = fallbackName(
		translationContext.activePlayer.name,
		'Player',
	);
	const defenderName = fallbackName(
		translationContext.opponent.name,
		'Opponent',
	);

	const collect = (
		effectDefinitions: EffectDef[],
		effectEntries: SummaryEntry[],
		owner: 'attacker' | 'defender',
	) => {
		const suffix =
			owner === 'defender' ? `for ${defenderName}` : `for ${attackerName}`;
		effectEntries.forEach((entry, index) => {
			const definition = effectDefinitions[index]!;
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
			formattedActionItems.push(...formattedActions);
			others.forEach((other) => {
				formattedItems.push(applyOwnerPresentation(owner, other, mode, suffix));
			});
		});
	};

	collect(defenderEffectDefinitions, defenderEntries, 'defender');
	collect(attackerEffectDefinitions, attackerEntries, 'attacker');

	const combined = formattedItems.concat(formattedActionItems);
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
	translationContext: TranslationContext,
): SummaryEntry[] {
	const formattedEntries: SummaryEntry[] = [];
	entry.defender.forEach((diffEntry) =>
		formattedEntries.push(
			formatter.formatDiff(
				ownerLabel(translationContext, 'defender'),
				diffEntry,
				translationContext,
			),
		),
	);
	entry.attacker.forEach((diffEntry) =>
		formattedEntries.push(
			formatter.formatDiff(
				ownerLabel(translationContext, 'attacker'),
				diffEntry,
				translationContext,
			),
		),
	);
	return formattedEntries;
}

export interface TransferEffectDetail {
	percent?: number;
	amount?: number;
}

export function collectTransferDetails(
	effects: EffectDef[] | undefined,
	transferDetails: Map<string, TransferEffectDetail>,
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
			const key = (() => {
				const rawKey = effectDefinition.params['key'];
				return typeof rawKey === 'string' ? rawKey : undefined;
			})();
			const percent = effectDefinition.params['percent'] as number | undefined;
			const amount = effectDefinition.params['amount'] as number | undefined;
			if (key && (percent !== undefined || amount !== undefined)) {
				const existing = transferDetails.get(key) ?? {};
				if (percent !== undefined && existing.percent === undefined) {
					existing.percent = percent;
				}
				if (amount !== undefined && existing.amount === undefined) {
					existing.amount = amount;
				}
				if (existing.percent !== undefined || existing.amount !== undefined) {
					transferDetails.set(key, existing);
				}
			}
		}
		if (Array.isArray(effectDefinition.effects)) {
			const nestedEffects = effectDefinition.effects;
			collectTransferDetails(nestedEffects, transferDetails);
		}
	}
}
