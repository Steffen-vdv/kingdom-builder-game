import type { EffectDef, AttackLog } from '@kingdom-builder/engine';
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

export const ATTACK_TARGET_FORMATTERS = {
	resource: resourceFormatter,
	stat: statFormatter,
	building: buildingFormatter,
} as const;

type AttackTargetFormatterType = keyof typeof ATTACK_TARGET_FORMATTERS;

type AttackTargetFormatterMapEntry =
	(typeof ATTACK_TARGET_FORMATTERS)[AttackTargetFormatterType];

function isAttackTargetFormatterType(
	type: string,
): type is AttackTargetFormatterType {
	return type in ATTACK_TARGET_FORMATTERS;
}

function resolveTargetWithFormatter(
	type: string | undefined,
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
	const info = formatter.getInfo(target);

	return {
		formatter: formatter as AttackTargetFormatter,
		target,
		info,
		targetLabel: formatter.getTargetLabel(info, target),
	};
}

export function resolveAttackTargetFormatter(
	effect: EffectDef<Record<string, unknown>>,
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

	return resolveTargetWithFormatter(type, (formatter) =>
		formatter.parseEffectTarget(effect),
	);
}

export function resolveAttackTargetFormatterFromLogTarget(
	target: AttackLog['evaluation']['target'],
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	return resolveTargetWithFormatter(target.type, (formatter) =>
		formatter.normalizeLogTarget(target),
	);
}
