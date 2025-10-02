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

export function resolveAttackTargetFormatter(
	effect: EffectDef<Record<string, unknown>>,
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	const targetParam = effect.params?.['target'] as
		| { type: AttackTarget['type'] }
		| undefined;
	const type = targetParam?.type ?? 'resource';

	if (type === 'stat') {
		const formatter = ATTACK_TARGET_FORMATTERS.stat;
		const target = formatter.parseEffectTarget(effect);
		const info = formatter.getInfo(target);
		return {
			formatter,
			target,
			info,
			targetLabel: formatter.getTargetLabel(info, target),
		};
	}

	if (type === 'building') {
		const formatter = ATTACK_TARGET_FORMATTERS.building;
		const target = formatter.parseEffectTarget(effect);
		const info = formatter.getInfo(target);
		return {
			formatter,
			target,
			info,
			targetLabel: formatter.getTargetLabel(info, target),
		};
	}

	const formatter = ATTACK_TARGET_FORMATTERS.resource;
	const target = formatter.parseEffectTarget(effect);
	const info = formatter.getInfo(target);
	return {
		formatter,
		target,
		info,
		targetLabel: formatter.getTargetLabel(info, target),
	};
}

export function resolveAttackTargetFormatterFromLogTarget(
	target: AttackLog['evaluation']['target'],
): {
	formatter: AttackTargetFormatter;
	target: AttackTarget;
	info: TargetInfo;
	targetLabel: string;
} {
	if (target.type === 'stat') {
		const formatter = ATTACK_TARGET_FORMATTERS.stat;
		const normalized = formatter.normalizeLogTarget(target);
		const info = formatter.getInfo(normalized);
		return {
			formatter,
			target: normalized,
			info,
			targetLabel: formatter.getTargetLabel(info, normalized),
		};
	}

	if (target.type === 'building') {
		const formatter = ATTACK_TARGET_FORMATTERS.building;
		const normalized = formatter.normalizeLogTarget(target);
		const info = formatter.getInfo(normalized);
		return {
			formatter,
			target: normalized,
			info,
			targetLabel: formatter.getTargetLabel(info, normalized),
		};
	}

	const formatter = ATTACK_TARGET_FORMATTERS.resource;
	const normalized = formatter.normalizeLogTarget(target);
	const info = formatter.getInfo(normalized);
	return {
		formatter,
		target: normalized,
		info,
		targetLabel: formatter.getTargetLabel(info, normalized),
	};
}
