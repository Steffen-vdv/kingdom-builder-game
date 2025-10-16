import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementList,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { GameApi, GameApiRequestOptions } from '../services/gameApi';
import type { RemoteSessionAdapter } from './remoteSessionAdapter';
import { enqueueSessionTask } from './sessionStateStore';

export interface FetchActionOptionsRequest extends SessionActionOptionsRequest {
	params?: ActionParametersPayload;
}

interface SessionMetadataRequest {
	sessionId: string;
	actionId: string;
	params?: ActionParametersPayload;
}

interface SessionMetadataDependencies {
	ensureGameApi: () => GameApi;
	getAdapter: (sessionId: string) => RemoteSessionAdapter;
	clone: <T>(value: T) => T;
}

export interface SessionMetadataHelpers {
	fetchActionCosts(
		request: SessionActionCostRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionActionCostMap>;
	fetchActionRequirements(
		request: SessionActionRequirementRequest,
		options?: GameApiRequestOptions,
	): Promise<SessionActionRequirementList>;
	fetchActionOptions(
		request: FetchActionOptionsRequest,
		options?: GameApiRequestOptions,
	): Promise<ActionEffectGroup[]>;
}

export function createSessionMetadataHelpers(
	dependencies: SessionMetadataDependencies,
): SessionMetadataHelpers {
	const createFetcher =
		<Request extends SessionMetadataRequest, Response, Result>(
			call: (
				api: GameApi,
				request: Request,
				options: GameApiRequestOptions,
			) => Promise<Response>,
			select: (response: Response) => Result,
			prime: (
				adapter: RemoteSessionAdapter,
				request: Request,
				result: Result,
			) => void,
		) =>
		async (
			request: Request,
			requestOptions: GameApiRequestOptions = {},
		): Promise<Result> => {
			const api = dependencies.ensureGameApi();
			const adapter = dependencies.getAdapter(request.sessionId);
			const response = await enqueueSessionTask(request.sessionId, () =>
				call(api, request, requestOptions),
			);
			const result = select(response);
			prime(adapter, request, result);
			return dependencies.clone(result);
		};

	return {
		fetchActionCosts: createFetcher(
			(api, request, options) => api.getActionCosts(request, options),
			(response: SessionActionCostResponse) => response.costs,
			(adapter, request, costs) =>
				adapter.primeActionCosts(request.actionId, request.params, costs),
		),
		fetchActionRequirements: createFetcher(
			(api, request, options) => api.getActionRequirements(request, options),
			(response: SessionActionRequirementResponse) => response.requirements,
			(adapter, request, requirements) =>
				adapter.primeActionRequirements(
					request.actionId,
					request.params,
					requirements,
				),
		),
		fetchActionOptions: createFetcher(
			(api, request, options) =>
				api.getActionOptions(
					{
						sessionId: request.sessionId,
						actionId: request.actionId,
					},
					options,
				),
			(response: SessionActionOptionsResponse) => response.groups,
			(adapter, request, groups) =>
				adapter.primeActionOptions(request.actionId, request.params, groups),
		),
	};
}
