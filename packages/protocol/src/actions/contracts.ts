import type {
	SessionActionRequirementList,
	SessionRequirementFailure,
	SessionSnapshot,
	SessionPassiveSummary,
} from '../session';
import type { SessionIdentifier } from '../session/contracts';

export interface ActionEffectChoice {
	optionId: string;
	params?: Record<string, unknown>;
}

export type ActionChoiceMap = Record<string, ActionEffectChoice>;

export type ActionParametersPayload = Record<string, unknown> & {
	choices?: ActionChoiceMap;
};

export interface ActionExecuteRequest extends SessionIdentifier {
	actionId: string;
	params?: ActionParametersPayload;
}

export interface ActionTraceLandSnapshot {
	id: string;
	slotsMax: number;
	slotsUsed: number;
	developments: string[];
}

export interface ActionPlayerSnapshot {
	resources: Record<string, number>;
	stats: Record<string, number>;
	buildings: string[];
	lands: ActionTraceLandSnapshot[];
	passives: SessionPassiveSummary[];
}

export interface ActionTrace {
	id: string;
	before: ActionPlayerSnapshot;
	after: ActionPlayerSnapshot;
}

export interface ActionExecuteSuccessResponse {
	status: 'success';
	snapshot: SessionSnapshot;
	traces: ActionTrace[];
	costs: Record<string, number>;
}

export interface ActionExecuteErrorResponse {
	status: 'error';
	error: string;
	requirementFailure?: SessionRequirementFailure;
	requirementFailures?: SessionActionRequirementList;
}

export type ActionExecuteResponse =
	| ActionExecuteSuccessResponse
	| ActionExecuteErrorResponse;
