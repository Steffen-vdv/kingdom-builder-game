import type { AttackLog, EffectDef } from '@kingdom-builder/protocol';
import resourceFormatter from './resource';
import statFormatter from './stat';
import buildingFormatter from './building';
import type { AttackTarget, AttackTargetFormatter, TargetInfo } from './types';
import type { TranslationContext } from '../../../context';
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

function resolveTargetWithFormatter(
	type: string | undefined,
	parseTarget: (formatter: AttackTargetFormatterMapEntry) => AttackTarget,
	translation: TranslationContext,
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
	const info = formatter.getInfo(target, translation);

	return {
		formatter: formatter as AttackTargetFormatter,
		target,
		info,
		targetLabel: formatter.getTargetLabel(info, target, translation),
	};
}

export function resolveAttackTargetFormatter(
	effect: EffectDef<Record<string, unknown>>,
	translation: TranslationContext,
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

	return resolveTargetWithFormatter(
		type,
		(formatter) => formatter.parseEffectTarget(effect, translation),
		translation,
	);
}

export function resolveAttackTargetFormatterFromLogTarget(
	target: AttackLog['evaluation']['target'],
	translation: TranslationContext,
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	return resolveTargetWithFormatter(
		target.type,
		(formatter) => formatter.normalizeLogTarget(target, translation),
		translation,
	);
}
