import { type ResourceKey } from '@kingdom-builder/contents';
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
/**
 * Create the base entry and related formatter context for an attack effect.
 *
 * @param effectDefinition - The effect definition that provides parameters and metadata used to build the entry
 * @param translationContext - The translation/localization context used to resolve formatter and labels
 * @param mode - The formatting mode that determines how the base entry should be built
 * @returns An object containing:
 *  - `entry`: the built base summary/description entry,
 *  - `formatter`: the resolved formatter instance,
 *  - `info`: resolved effect information,
 *  - `target`: resolved target data,
 *  - `targetLabel`: localized label for the target,
 *  - `stats`: resolved statistics used for formatting
 */
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

/**
 * Format the attacker and defender diff entries from an attack-on-damage log into summary items.
 *
 * @param entry - The attack-on-damage log entry containing `defender` and `attacker` diff arrays
 * @param formatter - Formatter used to convert each diff entry into a SummaryEntry
 * @param translationContext - Translation context used to resolve owner labels and passed to the formatter
 * @returns An array of formatted summary entries with defender entries first, followed by attacker entries
 */
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