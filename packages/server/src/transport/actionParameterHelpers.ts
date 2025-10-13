import { actionParametersSchema } from '@kingdom-builder/protocol';
import type { EngineSession } from '@kingdom-builder/engine';
import type { z } from 'zod';
import { TransportError } from './TransportTypes.js';

type ProtocolActionParameters = z.infer<typeof actionParametersSchema>;

export type EngineActionParameters = Parameters<
	EngineSession['getActionCosts']
>[1];

type NonNullableEngineActionParameters = Exclude<
	EngineActionParameters,
	undefined
>;

type _ProtocolMatchesEngine =
	ProtocolActionParameters extends NonNullableEngineActionParameters
		? true
		: never;

export function parseActionParameters(
	params: unknown,
	errorMessage: string,
): EngineActionParameters {
	if (params === undefined) {
		return undefined;
	}
	const parsed = actionParametersSchema.safeParse(params);
	if (!parsed.success) {
		throw new TransportError('INVALID_REQUEST', errorMessage, {
			issues: parsed.error.issues,
		});
	}
	const normalized = parsed.data as _ProtocolMatchesEngine extends true
		? EngineActionParameters
		: never;
	return normalized;
}
