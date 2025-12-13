import type { ResourceChangeBuilder, ResourceChangeEffectParams, ResourceChangeRoundingMode, ResourceReconciliationMode, ResourceTransferEffectParams } from '../resource';
import { ReconciliationMode, resourceChange, resourceTransfer, transferEndpoint } from '../resource';
import { getResourceId } from '../../internal';
import type { ResourceKey } from '../../internal';

// Legacy callback type - kept for backward compatibility during migration
type ChangeBuilderConfigurator = (builder: ResourceChangeBuilder) => void;

interface TransferReconciliationOptions {
	readonly donorMode?: ResourceReconciliationMode;
	readonly recipientMode?: ResourceReconciliationMode;
}

// Options-based configuration (preferred for non-technical content maintainers)
interface ResourceAmountChangeOptions {
	readonly roundingMode?: ResourceChangeRoundingMode;
	readonly reconciliation?: ResourceReconciliationMode | boolean;
}

type ResourceAmountParams = ResourceChangeEffectParams &
	Record<string, unknown> & {
		key: ResourceKey;
		amount: number;
	};

type ResourcePercentFromResourceParams = ResourceChangeEffectParams & Record<string, unknown>;

type ResourceTransferParams = ResourceTransferEffectParams &
	Record<string, unknown> & {
		key: ResourceKey;
		amount?: number;
		percent?: number;
	};

function configureBuilder(builder: ResourceChangeBuilder, configure?: ChangeBuilderConfigurator) {
	if (configure) {
		configure(builder);
	}
}

function applyOptions(builder: ResourceChangeBuilder, options?: ResourceAmountChangeOptions) {
	if (options?.roundingMode) {
		builder.roundingMode(options.roundingMode);
	}
	if (options?.reconciliation) {
		builder.reconciliation(typeof options.reconciliation === 'boolean' ? ReconciliationMode.CLAMP : options.reconciliation);
	}
}

// Overloaded: accepts either options object (preferred) or callback (legacy)
export function resourceAmountChange(resource: ResourceKey, amount: number, options?: ResourceAmountChangeOptions): ResourceAmountParams;
export function resourceAmountChange(resource: ResourceKey, amount: number, configure?: ChangeBuilderConfigurator): ResourceAmountParams;
export function resourceAmountChange(resource: ResourceKey, amount: number, configureOrOptions?: ChangeBuilderConfigurator | ResourceAmountChangeOptions): ResourceAmountParams {
	const builder = resourceChange(getResourceId(resource));
	builder.amount(amount);
	if (typeof configureOrOptions === 'function') {
		configureBuilder(builder, configureOrOptions);
	} else {
		applyOptions(builder, configureOrOptions);
	}
	return {
		...builder.build(),
		key: resource,
		amount,
	};
}

export function resourcePercentFromResourceChange(
	targetResourceId: string,
	sourceResourceId: string,
	options?: { roundingMode?: 'up' | 'down'; additive?: boolean },
): ResourcePercentFromResourceParams {
	return {
		resourceId: targetResourceId,
		change: {
			type: 'percentFromResource',
			sourceResourceId,
			...(options?.roundingMode ? { roundingMode: options.roundingMode } : {}),
			...(options?.additive !== undefined ? { additive: options.additive } : {}),
		},
	};
}

export function resourceTransferAmount(resource: ResourceKey, amount: number, reconciliation?: TransferReconciliationOptions): ResourceTransferParams {
	const resourceId = getResourceId(resource);
	const donorBuilder = transferEndpoint(resourceId).player('opponent').changeAmount(-amount);
	if (reconciliation?.donorMode) {
		donorBuilder.reconciliation(reconciliation.donorMode);
	}
	const recipientBuilder = transferEndpoint(resourceId).player('active').changeAmount(amount);
	if (reconciliation?.recipientMode) {
		recipientBuilder.reconciliation(reconciliation.recipientMode);
	}
	const transfer = resourceTransfer().donor(donorBuilder.build()).recipient(recipientBuilder.build()).build();
	return {
		...transfer,
		key: resource,
		amount,
	};
}

export function resourceTransferPercent(resource: ResourceKey, percent: number, reconciliation?: TransferReconciliationOptions): ResourceTransferParams {
	const resourceId = getResourceId(resource);
	const donorBuilder = transferEndpoint(resourceId).player('opponent').changePercent(-percent);
	if (reconciliation?.donorMode) {
		donorBuilder.reconciliation(reconciliation.donorMode);
	}
	const recipientBuilder = transferEndpoint(resourceId).player('active').changePercent(percent);
	if (reconciliation?.recipientMode) {
		recipientBuilder.reconciliation(reconciliation.recipientMode);
	}
	const transfer = resourceTransfer().donor(donorBuilder.build()).recipient(recipientBuilder.build()).build();
	return {
		...transfer,
		key: resource,
		percent,
	};
}
