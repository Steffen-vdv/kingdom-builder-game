import { resourceChange } from './changeBuilder';
import type { ResourceChangeBuilder } from './changeBuilder';
import type { ResourceChangeParameters, ResourceReconciliationMode, ResourcePlayerScope, ResourceTransferEffectParams, ResourceTransferEndpointPayload, ResourceValueWriteOptions } from './types';

const ENDPOINT_BUILDER_NAME = 'Resource transfer endpoint builder';
const TRANSFER_BUILDER_NAME = 'Resource transfer builder';

const SUPPORTED_RECONCILIATION_MODES: ReadonlySet<ResourceReconciliationMode> = new Set(['clamp']);

type ChangeConfigurator = ResourceChangeParameters | ((builder: ResourceChangeBuilder) => ResourceChangeBuilder | void);

export interface ResourceTransferEndpointBuilder {
	player(scope: ResourcePlayerScope): this;
	change(configurator: ChangeConfigurator): this;
	reconciliation(mode?: ResourceReconciliationMode): this;
	suppressRecentEntry(enabled?: boolean): this;
	skipTierUpdate(enabled?: boolean): this;
	build(): ResourceTransferEndpointPayload;
}

export interface ResourceTransferBuilder {
	donor(payload: ResourceTransferEndpointPayload): this;
	recipient(payload: ResourceTransferEndpointPayload): this;
	build(): ResourceTransferEffectParams;
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

	if (change.type === 'percentFromResource') {
		return {
			type: 'percentFromResource',
			sourceResourceId: change.sourceResourceId,
			...(change.roundingMode ? { roundingMode: change.roundingMode } : {}),
			...(change.additive !== undefined ? { additive: change.additive } : {}),
		};
	}

	if (change.modifiers.length === 0) {
		throw new Error(`${ENDPOINT_BUILDER_NAME} percent change requires at least one modifier.`);
	}

	const modifiers = change.modifiers.map((modifier: number, index: number) => {
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

function normaliseOptions(options: ResourceValueWriteOptions | undefined): ResourceValueWriteOptions | undefined {
	if (!options) {
		return undefined;
	}

	const result: {
		suppressRecentEntry?: boolean;
		skipTierUpdate?: boolean;
	} = {};
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

	return Object.keys(result).length > 0 ? (result as ResourceValueWriteOptions) : undefined;
}

class ResourceTransferEndpointBuilderImpl implements ResourceTransferEndpointBuilder {
	private readonly resourceId: string;
	private playerScope?: ResourcePlayerScope;
	private changeParams?: ResourceChangeParameters;
	private reconciliationMode?: ResourceReconciliationMode;
	private suppressRecentEntryFlag = false;
	private skipTierUpdateFlag = false;

	constructor(resourceId: string) {
		assertResourceId(resourceId, ENDPOINT_BUILDER_NAME);
		this.resourceId = resourceId;
	}

	player(scope: ResourcePlayerScope): this {
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

	suppressRecentEntry(enabled = true): this {
		this.suppressRecentEntryFlag = enabled ?? true;
		return this;
	}

	skipTierUpdate(enabled = true): this {
		this.skipTierUpdateFlag = enabled ?? true;
		return this;
	}

	build(): ResourceTransferEndpointPayload {
		if (!this.changeParams) {
			throw new Error(`${ENDPOINT_BUILDER_NAME} requires change() before build().`);
		}

		const options: {
			suppressRecentEntry?: boolean;
			skipTierUpdate?: boolean;
		} = {};
		if (this.suppressRecentEntryFlag) {
			options.suppressRecentEntry = true;
		}
		if (this.skipTierUpdateFlag) {
			options.skipTierUpdate = true;
		}

		const normalisedOptions = Object.keys(options).length > 0 ? (options as ResourceValueWriteOptions) : undefined;

		return {
			resourceId: this.resourceId,
			change: normaliseChange(this.changeParams),
			...(this.playerScope ? { player: this.playerScope } : {}),
			...(this.reconciliationMode ? { reconciliationMode: this.reconciliationMode } : {}),
			...(normalisedOptions ? { options: normalisedOptions } : {}),
		};
	}
}

function cloneEndpointPayload(payload: ResourceTransferEndpointPayload, role: 'donor' | 'recipient'): ResourceTransferEndpointPayload {
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
	private donorPayload?: ResourceTransferEndpointPayload;
	private recipientPayload?: ResourceTransferEndpointPayload;

	donor(payload: ResourceTransferEndpointPayload): this {
		this.donorPayload = cloneEndpointPayload(payload, 'donor');
		return this;
	}

	recipient(payload: ResourceTransferEndpointPayload): this {
		this.recipientPayload = cloneEndpointPayload(payload, 'recipient');
		return this;
	}

	build(): ResourceTransferEffectParams {
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
