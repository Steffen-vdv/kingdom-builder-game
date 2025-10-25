import { resourceChange } from './changeBuilder';
import type { ResourceChangeBuilder } from './changeBuilder';
import type {
	ResourceChangeParameters,
	ResourceReconciliationMode,
	ResourceV2PlayerScope,
	ResourceV2TransferEffectParams,
	ResourceV2TransferEndpointPayload,
	ResourceV2ValueWriteOptions,
} from './types';

const ENDPOINT_BUILDER_NAME = 'ResourceV2 transfer endpoint builder';
const TRANSFER_BUILDER_NAME = 'ResourceV2 transfer builder';

const SUPPORTED_RECONCILIATION_MODES: ReadonlySet<ResourceReconciliationMode> = new Set(['clamp']);

type ChangeConfigurator = ResourceChangeParameters | ((builder: ResourceChangeBuilder) => ResourceChangeBuilder | void);

export interface ResourceTransferEndpointBuilder {
	player(scope: ResourceV2PlayerScope): this;
	change(configurator: ChangeConfigurator): this;
	reconciliation(mode?: ResourceReconciliationMode): this;
	suppressTouched(enabled?: boolean): this;
	suppressRecentEntry(enabled?: boolean): this;
	skipTierUpdate(enabled?: boolean): this;
	build(): ResourceV2TransferEndpointPayload;
}

export interface ResourceTransferBuilder {
	donor(payload: ResourceV2TransferEndpointPayload): this;
	recipient(payload: ResourceV2TransferEndpointPayload): this;
	build(): ResourceV2TransferEffectParams;
}

function assertResourceId(resourceId: string, context: string): void {
	if (!resourceId) {
		throw new Error(`${context} requires a non-empty resourceId.`);
	}
}

function ensureFinite(value: number, field: string): void {
	if (!Number.isFinite(value)) {
		throw new Error(`${ENDPOINT_BUILDER_NAME} expected ${field} to be a finite number but received ${value}.`);
	}
}

function normaliseChange(change: ResourceChangeParameters): ResourceChangeParameters {
	if (change.type === 'amount') {
		ensureFinite(change.amount, 'amount');
		return { type: 'amount', amount: change.amount };
	}

	if (change.modifiers.length === 0) {
		throw new Error(`${ENDPOINT_BUILDER_NAME} percent change requires at least one modifier.`);
	}

	const modifiers = change.modifiers.map((modifier, index) => {
		ensureFinite(modifier, `percent modifier at position ${index}`);
		return modifier;
	});

	return {
		type: 'percent',
		modifiers,
		...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
	};
}

function assertReconciliationMode(mode: ResourceReconciliationMode | undefined, context: string): void {
	if (mode && !SUPPORTED_RECONCILIATION_MODES.has(mode)) {
		throw new Error(`${context} reconciliation mode "${mode}" is not supported yet. Supported modes: clamp.`);
	}
}

function normaliseOptions(options: ResourceV2ValueWriteOptions | undefined): ResourceV2ValueWriteOptions | undefined {
	if (!options) {
		return undefined;
	}

	const result: {
		suppressTouched?: boolean;
		suppressRecentEntry?: boolean;
		skipTierUpdate?: boolean;
	} = {};
	if (options.suppressTouched !== undefined) {
		if (typeof options.suppressTouched !== 'boolean') {
			throw new Error(`${TRANSFER_BUILDER_NAME} expected options.suppressTouched to be boolean when provided.`);
		}
		if (options.suppressTouched) {
			result.suppressTouched = true;
		}
	}
	if (options.suppressRecentEntry !== undefined) {
		if (typeof options.suppressRecentEntry !== 'boolean') {
			throw new Error(`${TRANSFER_BUILDER_NAME} expected options.suppressRecentEntry to be boolean when provided.`);
		}
		if (options.suppressRecentEntry) {
			result.suppressRecentEntry = true;
		}
	}
	if (options.skipTierUpdate !== undefined) {
		if (typeof options.skipTierUpdate !== 'boolean') {
			throw new Error(`${TRANSFER_BUILDER_NAME} expected options.skipTierUpdate to be boolean when provided.`);
		}
		if (options.skipTierUpdate) {
			result.skipTierUpdate = true;
		}
	}

	return Object.keys(result).length > 0 ? (result as ResourceV2ValueWriteOptions) : undefined;
}

class ResourceTransferEndpointBuilderImpl implements ResourceTransferEndpointBuilder {
	private readonly resourceId: string;
	private playerScope?: ResourceV2PlayerScope;
	private changeParams?: ResourceChangeParameters;
	private reconciliationMode?: ResourceReconciliationMode;
	private suppressTouchedFlag = false;
	private suppressRecentEntryFlag = false;
	private skipTierUpdateFlag = false;

	constructor(resourceId: string) {
		assertResourceId(resourceId, ENDPOINT_BUILDER_NAME);
		this.resourceId = resourceId;
	}

	player(scope: ResourceV2PlayerScope): this {
		this.playerScope = scope;
		return this;
	}

	change(configurator: ChangeConfigurator): this {
		if (typeof configurator === 'function') {
			const builder = resourceChange(this.resourceId);
			const configured = configurator(builder) ?? builder;
			const built = configured.build();
			if (built.resourceId !== this.resourceId) {
				throw new Error(`${ENDPOINT_BUILDER_NAME} change() cannot override the resourceId. Expected "${this.resourceId}" but received "${built.resourceId}".`);
			}
			if (built.suppressHooks) {
				throw new Error(`${ENDPOINT_BUILDER_NAME} does not support suppressHooks(). Remove the suppressHooks() call when configuring donor/recipient changes.`);
			}
			this.changeParams = normaliseChange(built.change);
			if (built.reconciliation !== undefined) {
				this.reconciliationMode = built.reconciliation;
			}
			return this;
		}

		this.changeParams = normaliseChange(configurator);
		return this;
	}

	reconciliation(mode: ResourceReconciliationMode = 'clamp'): this {
		assertReconciliationMode(mode, ENDPOINT_BUILDER_NAME);
		this.reconciliationMode = mode;
		return this;
	}

	suppressTouched(enabled = true): this {
		this.suppressTouchedFlag = enabled ?? true;
		return this;
	}

	suppressRecentEntry(enabled = true): this {
		this.suppressRecentEntryFlag = enabled ?? true;
		return this;
	}

	skipTierUpdate(enabled = true): this {
		this.skipTierUpdateFlag = enabled ?? true;
		return this;
	}

	build(): ResourceV2TransferEndpointPayload {
		if (!this.changeParams) {
			throw new Error(`${ENDPOINT_BUILDER_NAME} requires change() before build().`);
		}

		const options: {
			suppressTouched?: boolean;
			suppressRecentEntry?: boolean;
			skipTierUpdate?: boolean;
		} = {};
		if (this.suppressTouchedFlag) {
			options.suppressTouched = true;
		}
		if (this.suppressRecentEntryFlag) {
			options.suppressRecentEntry = true;
		}
		if (this.skipTierUpdateFlag) {
			options.skipTierUpdate = true;
		}

		const normalisedOptions = Object.keys(options).length > 0 ? (options as ResourceV2ValueWriteOptions) : undefined;

		return {
			resourceId: this.resourceId,
			change: normaliseChange(this.changeParams),
			...(this.playerScope ? { player: this.playerScope } : {}),
			...(this.reconciliationMode ? { reconciliationMode: this.reconciliationMode } : {}),
			...(normalisedOptions ? { options: normalisedOptions } : {}),
		};
	}
}

function cloneEndpointPayload(payload: ResourceV2TransferEndpointPayload, role: 'donor' | 'recipient'): ResourceV2TransferEndpointPayload {
	if (!payload) {
		throw new Error(`${TRANSFER_BUILDER_NAME} ${role}() requires a payload built via transferEndpoint().`);
	}

	assertResourceId(payload.resourceId, `${TRANSFER_BUILDER_NAME} ${role}()`);
	assertReconciliationMode(payload.reconciliationMode, `${TRANSFER_BUILDER_NAME} ${role}()`);

	const normalisedOptions = normaliseOptions(payload.options);

	return {
		...(payload.player ? { player: payload.player } : {}),
		resourceId: payload.resourceId,
		change: normaliseChange(payload.change),
		...(payload.reconciliationMode ? { reconciliationMode: payload.reconciliationMode } : {}),
		...(normalisedOptions ? { options: normalisedOptions } : {}),
	};
}

class ResourceTransferBuilderImpl implements ResourceTransferBuilder {
	private donorPayload?: ResourceV2TransferEndpointPayload;
	private recipientPayload?: ResourceV2TransferEndpointPayload;

	donor(payload: ResourceV2TransferEndpointPayload): this {
		this.donorPayload = cloneEndpointPayload(payload, 'donor');
		return this;
	}

	recipient(payload: ResourceV2TransferEndpointPayload): this {
		this.recipientPayload = cloneEndpointPayload(payload, 'recipient');
		return this;
	}

	build(): ResourceV2TransferEffectParams {
		if (!this.donorPayload) {
			throw new Error(`${TRANSFER_BUILDER_NAME} requires donor() before build().`);
		}
		if (!this.recipientPayload) {
			throw new Error(`${TRANSFER_BUILDER_NAME} requires recipient() before build().`);
		}

		return {
			donor: cloneEndpointPayload(this.donorPayload, 'donor'),
			recipient: cloneEndpointPayload(this.recipientPayload, 'recipient'),
		};
	}
}

export function transferEndpoint(resourceId: string): ResourceTransferEndpointBuilder {
	return new ResourceTransferEndpointBuilderImpl(resourceId);
}

export function resourceTransfer(): ResourceTransferBuilder {
	return new ResourceTransferBuilderImpl();
}
