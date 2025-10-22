import type { EvaluatorDef } from './evaluators';

export interface EffectDef<
	P extends Record<string, unknown> = Record<string, unknown>,
> {
	type?: string | undefined;
	method?: string | undefined;
	params?: P | undefined;
	effects?: EffectDef[] | undefined;
	evaluator?: EvaluatorDef | undefined;
	round?: 'up' | 'down' | 'nearest' | undefined;
	reconciliation?:
		| {
				onValue?: 'clamp' | 'pass' | 'reject' | undefined;
				onBounds?: 'clamp' | 'pass' | 'reject' | undefined;
		  }
		| undefined;
	suppressHooks?: boolean | undefined;
	meta?: Record<string, unknown> | undefined;
}
