import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '@kingdom-builder/protocol';

export type FetchInput = Parameters<typeof fetch>[0];
export type FetchInit = Parameters<typeof fetch>[1];
export type FetchLike = (
	input: FetchInput,
	init?: FetchInit,
) => Promise<Response>;
export type HeaderInput = ConstructorParameters<typeof Headers>[0];
export type HeaderFactory =
	| HeaderInput
	| (() => HeaderInput | Promise<HeaderInput>);
export interface RequestOptions {
	readonly method: string;
	readonly path: string;
	readonly body?: unknown;
}
export interface HttpExecutionResult {
	readonly response: Response;
	readonly data: unknown;
}
export type FetchActionCostsHandler = (
	request: SessionActionCostRequest,
) => Promise<SessionActionCostResponse>;
export type FetchActionRequirementsHandler = (
	request: SessionActionRequirementRequest,
) => Promise<SessionActionRequirementResponse>;
export type FetchActionOptionsHandler = (
	request: SessionActionOptionsRequest,
) => Promise<SessionActionOptionsResponse>;
export type RunAiTurnHandler = (
	request: SessionRunAiRequest,
) => Promise<SessionRunAiResponse>;
export type SimulatePhasesHandler = (
	request: SessionSimulateRequest,
) => Promise<SessionSimulateResponse>;
