import { ResourceV2ReconciliationStrategy } from '../../../resourceV2';
import type { ResourceV2RoundingMode } from '../../../resourceV2';
import { ParamsBuilder } from '../../builderShared';
import type { Params } from '../../builderShared';

const CLAMP_ONLY_MESSAGE = 'ResourceV2 effects only support clamp reconciliation during the MVP. Remove the unsupported reconciliation configuration.';
const RESOURCE_ID_DUPLICATE = 'ResourceV2 effect already defined resourceId(). Remove the extra resource() or resourceId() call.';
const SUPPRESS_HOOKS_DUPLICATE = 'ResourceV2 effect already configured suppressHooks(). Remove the duplicate suppressHooks() call.';
const RECONCILIATION_DUPLICATE = 'ResourceV2 effect already configured reconciliation(). Remove the duplicate reconciliation() call.';
const DONOR_DUPLICATE = 'ResourceV2 transfer already configured donor(). Remove the duplicate donor() call.';
const RECIPIENT_DUPLICATE = 'ResourceV2 transfer already configured recipient(). Remove the duplicate recipient() call.';
const PAYLOAD_DUPLICATE = 'ResourceV2 effect already defined an amount() or percent(). Remove the duplicate payload configuration call.';
const PAYLOAD_MISSING = 'ResourceV2 effect needs amount() or percent(). Configure a payload before build().';
const ROUNDING_WITHOUT_PERCENT = 'Percent rounding requires percent(). Call percent() before rounding().';
const ROUNDING_DUPLICATE = 'Percent payload already configured rounding(). Remove the duplicate rounding() call.';
const ROUNDING_REQUIRED = 'Percent payload requires rounding(). Call rounding(ResourceV2RoundingMode.X) to choose how the percent resolves.';
const TRANSFER_DONOR_MISSING = 'ResourceV2 transfer is missing donor(). Call donor(ResourceId) before build().';
const TRANSFER_RECIPIENT_MISSING = 'ResourceV2 transfer is missing recipient(). Call recipient(ResourceId) before build().';
const RESOURCE_ID_MISSING = 'ResourceV2 effect is missing resource(). Call resource(ResourceId) before build().';
const BOUND_AMOUNT_DUPLICATE = 'ResourceV2 bound adjustment already defined amount(). Remove the duplicate amount() call.';
const BOUND_AMOUNT_MISSING = 'ResourceV2 bound adjustment requires amount(). Call amount(value) before build().';
const BOUND_DECREASE_UNSUPPORTED = 'ResourceV2 MVP defers bound decreases. Remove the decrease() configuration.';

function ensureClamp(reconciliation: ResourceV2ReconciliationStrategy | undefined): ResourceV2ReconciliationStrategy {
	if (reconciliation !== undefined && reconciliation !== ResourceV2ReconciliationStrategy.Clamp) {
		throw new Error(CLAMP_ONLY_MESSAGE);
	}
	return ResourceV2ReconciliationStrategy.Clamp;
}

type ResourceV2PercentPayloadDraft = {
	kind: 'percent';
	percent: number;
	rounding?: ResourceV2RoundingMode;
};

type ResourceV2PayloadDraft = { kind: 'amount'; amount: number } | ResourceV2PercentPayloadDraft;

export type ResourceV2ValuePayload = { kind: 'amount'; amount: number } | { kind: 'percent'; percent: number; rounding: ResourceV2RoundingMode };

class ResourceV2PayloadState {
	private payload: ResourceV2PayloadDraft | undefined;

	amount(amount: number) {
		if (this.payload) {
			throw new Error(PAYLOAD_DUPLICATE);
		}
		this.payload = { kind: 'amount', amount };
	}

	percent(percent: number) {
		if (this.payload) {
			throw new Error(PAYLOAD_DUPLICATE);
		}
		this.payload = { kind: 'percent', percent };
	}

	rounding(mode: ResourceV2RoundingMode) {
		if (!this.payload || this.payload.kind !== 'percent') {
			throw new Error(ROUNDING_WITHOUT_PERCENT);
		}
		if (this.payload.rounding !== undefined) {
			throw new Error(ROUNDING_DUPLICATE);
		}
		this.payload.rounding = mode;
	}

	build(): ResourceV2ValuePayload {
		if (!this.payload) {
			throw new Error(PAYLOAD_MISSING);
		}
		if (this.payload.kind === 'percent') {
			if (this.payload.rounding === undefined) {
				throw new Error(ROUNDING_REQUIRED);
			}
			return {
				kind: 'percent',
				percent: this.payload.percent,
				rounding: this.payload.rounding,
			} satisfies ResourceV2ValuePayload;
		}
		return this.payload;
	}
}

interface ResourceV2ValueEffectParamsDraft extends Params {
	resourceId?: string;
	reconciliation?: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export interface ResourceV2ValueEffectParams extends Params {
	resourceId: string;
	payload: ResourceV2ValuePayload;
	reconciliation: ResourceV2ReconciliationStrategy;
	suppressHooks?: boolean;
}

export class ResourceV2ValueEffectParamsBuilder extends ParamsBuilder<ResourceV2ValueEffectParamsDraft> {
	private readonly payloadState = new ResourceV2PayloadState();

	resource(resourceId: string) {
		return this.set('resourceId', resourceId, RESOURCE_ID_DUPLICATE);
	}

	resourceId(resourceId: string) {
		return this.resource(resourceId);
	}

	amount(amount: number) {
		this.payloadState.amount(amount);
		return this;
	}

	percent(percent: number) {
		this.payloadState.percent(percent);
		return this;
	}

	rounding(mode: ResourceV2RoundingMode) {
		this.payloadState.rounding(mode);
		return this;
	}

	reconciliation(strategy: ResourceV2ReconciliationStrategy) {
		if (strategy !== ResourceV2ReconciliationStrategy.Clamp) {
			throw new Error(CLAMP_ONLY_MESSAGE);
		}
		return this.set('reconciliation', strategy, RECONCILIATION_DUPLICATE);
	}

	suppressHooks(flag = true) {
		return this.set('suppressHooks', flag, SUPPRESS_HOOKS_DUPLICATE);
	}

	override build(): ResourceV2ValueEffectParams {
		if (!this.wasSet('resourceId')) {
			throw new Error(RESOURCE_ID_MISSING);
		}
		const payload = this.payloadState.build();
		const reconciliation = ensureClamp(this.params.reconciliation);
		const result: ResourceV2ValueEffectParams = {
			resourceId: this.params.resourceId!,
			payload,
			reconciliation,
		};
		if (this.params.suppressHooks) {
			result.suppressHooks = this.params.suppressHooks;
		}
		return result;
	}
}

interface ResourceV2TransferEffectParamsDraft extends Params {
	donor?: ResourceV2TransferEndpointParams;
	recipient?: ResourceV2TransferEndpointParams;
	suppressHooks?: boolean;
}

export interface ResourceV2TransferEndpointParams {
	resourceId: string;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2TransferEffectParams extends Params {
	donor: ResourceV2TransferEndpointParams;
	recipient: ResourceV2TransferEndpointParams;
	payload: ResourceV2ValuePayload;
	suppressHooks?: boolean;
}

export class ResourceV2TransferEffectParamsBuilder extends ParamsBuilder<ResourceV2TransferEffectParamsDraft> {
	private readonly payloadState = new ResourceV2PayloadState();

	donor(resourceId: string, reconciliation?: ResourceV2ReconciliationStrategy) {
		const endpoint: ResourceV2TransferEndpointParams = {
			resourceId,
			reconciliation: ensureClamp(reconciliation),
		};
		return this.set('donor', endpoint, DONOR_DUPLICATE);
	}

	recipient(resourceId: string, reconciliation?: ResourceV2ReconciliationStrategy) {
		const endpoint: ResourceV2TransferEndpointParams = {
			resourceId,
			reconciliation: ensureClamp(reconciliation),
		};
		return this.set('recipient', endpoint, RECIPIENT_DUPLICATE);
	}

	amount(amount: number) {
		this.payloadState.amount(amount);
		return this;
	}

	percent(percent: number) {
		this.payloadState.percent(percent);
		return this;
	}

	rounding(mode: ResourceV2RoundingMode) {
		this.payloadState.rounding(mode);
		return this;
	}

	suppressHooks(flag = true) {
		return this.set('suppressHooks', flag, SUPPRESS_HOOKS_DUPLICATE);
	}

	override build(): ResourceV2TransferEffectParams {
		if (!this.wasSet('donor')) {
			throw new Error(TRANSFER_DONOR_MISSING);
		}
		if (!this.wasSet('recipient')) {
			throw new Error(TRANSFER_RECIPIENT_MISSING);
		}
		const payload = this.payloadState.build();
		const result: ResourceV2TransferEffectParams = {
			donor: this.params.donor!,
			recipient: this.params.recipient!,
			payload,
		};
		if (this.params.suppressHooks) {
			result.suppressHooks = this.params.suppressHooks;
		}
		return result;
	}
}

interface ResourceV2BoundAdjustmentParamsDraft extends Params {
	resourceId?: string;
	amount?: number;
	reconciliation?: ResourceV2ReconciliationStrategy;
}

export interface ResourceV2BoundAdjustmentParams extends Params {
	resourceId: string;
	amount: number;
	reconciliation: ResourceV2ReconciliationStrategy;
}

export class ResourceV2UpperBoundEffectParamsBuilder extends ParamsBuilder<ResourceV2BoundAdjustmentParamsDraft> {
	amount(amount: number) {
		return this.set('amount', amount, BOUND_AMOUNT_DUPLICATE);
	}

	resource(resourceId: string) {
		return this.set('resourceId', resourceId, RESOURCE_ID_DUPLICATE);
	}

	resourceId(resourceId: string) {
		return this.resource(resourceId);
	}

	reconciliation(strategy: ResourceV2ReconciliationStrategy) {
		if (strategy !== ResourceV2ReconciliationStrategy.Clamp) {
			throw new Error(CLAMP_ONLY_MESSAGE);
		}
		return this.set('reconciliation', strategy, RECONCILIATION_DUPLICATE);
	}

	decrease() {
		throw new Error(BOUND_DECREASE_UNSUPPORTED);
	}

	override build(): ResourceV2BoundAdjustmentParams {
		if (!this.wasSet('resourceId')) {
			throw new Error(RESOURCE_ID_MISSING);
		}
		if (!this.wasSet('amount')) {
			throw new Error(BOUND_AMOUNT_MISSING);
		}
		return {
			resourceId: this.params.resourceId!,
			amount: this.params.amount!,
			reconciliation: ensureClamp(this.params.reconciliation),
		};
	}
}

export function resourceV2ValueParams() {
	return new ResourceV2ValueEffectParamsBuilder();
}

export function resourceV2TransferParams() {
	return new ResourceV2TransferEffectParamsBuilder();
}

export function resourceV2UpperBoundParams() {
	return new ResourceV2UpperBoundEffectParamsBuilder();
}
