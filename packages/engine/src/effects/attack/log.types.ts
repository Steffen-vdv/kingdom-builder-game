import type { EffectDef } from '@kingdom-builder/protocol';
import type { AttackEvaluationTargetLog } from '../attack.types';
import type { AttackPlayerDiff } from './snapshot_diff';

export interface AttackCalcOptions {
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
}

export type AttackLogOwner = 'attacker' | 'defender';

export interface AttackPowerLog {
	base: number;
	modified: number;
}

export interface AttackEvaluationLog {
	power: AttackPowerLog;
	absorption: {
		ignored: boolean;
		before: number;
		damageAfter: number;
	};
	fortification: {
		ignored: boolean;
		before: number;
		damage: number;
		after: number;
	};
	target: AttackEvaluationTargetLog;
}

export interface AttackOnDamageLogEntry {
	owner: AttackLogOwner;
	effect: EffectDef;
	attacker: AttackPlayerDiff[];
	defender: AttackPlayerDiff[];
}

export interface AttackLog {
	evaluation: AttackEvaluationLog;
	onDamage: AttackOnDamageLogEntry[];
}
