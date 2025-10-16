import type { AttackLog, EffectDef } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../../context';
import resourceFormatter from './resource';
import statFormatter from './stat';
import buildingFormatter from './building';
import type { AttackTarget, AttackTargetFormatter, TargetInfo } from './types';
export type {
	Mode,
	AttackTarget,
	AttackTargetFormatter,
	TargetInfo,
} from './types';

type AttackTargetFormatterRegistry = {
	[Type in AttackTarget['type']]: AttackTargetFormatter<
		Extract<AttackTarget, { type: Type }>
	>;
};

export const ATTACK_TARGET_FORMATTERS: AttackTargetFormatterRegistry = {
	resource: resourceFormatter,
	stat: statFormatter,
	building: buildingFormatter,
};

type AttackTargetFormatterType = keyof AttackTargetFormatterRegistry;

type AttackTargetFormatterMapEntry = AttackTargetFormatter<AttackTarget>;

function isAttackTargetFormatterType(
	type: string,
): type is AttackTargetFormatterType {
	return type in ATTACK_TARGET_FORMATTERS;
}

/**
 * Selects an attack target formatter, parses and validates a target, and returns the formatter plus target metadata.
 *
 * @param type - Optional formatter type hint; if omitted or not a known formatter type, the `"resource"` formatter is used.
 * @param translationContext - Translation context passed to the formatter when computing target info.
 * @param parseTarget - Callback that receives the chosen formatter and returns a parsed `AttackTarget`.
 * @returns An object containing:
 *   - `formatter`: the resolved `AttackTargetFormatter`
 *   - `target`: the parsed `AttackTarget`
 *   - `info`: `TargetInfo` produced by the formatter for the target
 *   - `targetLabel`: human-readable label for the target
 */
function resolveTargetWithFormatter(
	type: string | undefined,
	translationContext: TranslationContext,
	parseTarget: (formatter: AttackTargetFormatterMapEntry) => AttackTarget,
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	const resolvedType: AttackTargetFormatterType =
		type && isAttackTargetFormatterType(type) ? type : 'resource';
	const formatter = ATTACK_TARGET_FORMATTERS[
		resolvedType
	] as AttackTargetFormatterMapEntry;
	const target = parseTarget(formatter);
	if (target.type !== formatter.type) {
		const expectedType = formatter.type;
		const receivedType = target.type;

		throw new Error(
			`Formatter mismatch: expected type "${expectedType}" but received "${receivedType}"`,
		);
	}
	const info = formatter.getInfo(target, translationContext);

	return {
		formatter: formatter as AttackTargetFormatter,
		target,
		info,
		targetLabel: formatter.getTargetLabel(info, target),
	};
}

/**
 * Resolve the appropriate attack target formatter and produce the parsed target, its metadata, and a display label for a given effect.
 *
 * @param effect - Effect definition that may contain a `target` parameter used to select or configure the formatter
 * @param translationContext - Context used for localization/translation when parsing and retrieving target info
 * @returns An object with:
 *  - `formatter`: the selected AttackTargetFormatter implementation,
 *  - `target`: the parsed AttackTarget for the effect,
 *  - `info`: TargetInfo produced by the formatter for the parsed target,
 *  - `targetLabel`: human-readable label for the target produced by the formatter
 */
export function resolveAttackTargetFormatter(
	effect: EffectDef<Record<string, unknown>>,
	translationContext: TranslationContext,
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	const targetParam = effect.params?.['target'] as
		| { type?: string }
		| undefined;
	const type = targetParam?.type;

	return resolveTargetWithFormatter(type, translationContext, (formatter) =>
		formatter.parseEffectTarget(effect, translationContext),
	);
}

/**
 * Resolve the appropriate attack target formatter and produce the normalized target info and label from a log target.
 *
 * @param target - The log's evaluation target to normalize and resolve
 * @param translationContext - Context used for translation/localization when obtaining target info
 * @returns An object containing:
 *  - `formatter`: the chosen AttackTargetFormatter
 *  - `target`: the normalized AttackTarget
 *  - `info`: TargetInfo computed by the formatter
 *  - `targetLabel`: Human-readable label for the target
 */
export function resolveAttackTargetFormatterFromLogTarget(
	target: AttackLog['evaluation']['target'],
	translationContext: TranslationContext,
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	return resolveTargetWithFormatter(
		target.type,
		translationContext,
		(formatter) => formatter.normalizeLogTarget(target),
	);
}