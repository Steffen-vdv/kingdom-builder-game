import type { ResourceChangeBuilder, ResourceChangeEffectParams, ResourceReconciliationMode, ResourceTransferEffectParams } from '../resource';
import { resourceChange, resourceTransfer, transferEndpoint } from '../resource';
import { getResourceId } from '../internal';
import type { ResourceKey } from '../internal';

type ChangeBuilderConfigurator = (builder: ResourceChangeBuilder) => void;

interface TransferReconciliationOptions {
	readonly donorMode?: ResourceReconciliationMode;
	readonly recipientMode?: ResourceReconciliationMode;
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

export function resourceAmountChange(resource: ResourceKey, amount: number, configure?: ChangeBuilderConfigurator): ResourceAmountParams {
	const builder = resourceChange(getResourceId(resource));
	builder.amount(amount);
	configureBuilder(builder, configure);
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
	const donorBuilder = transferEndpoint(resourceId)
		.player('opponent')
		.change((change) => change.amount(-amount));
	if (reconciliation?.donorMode) {
		donorBuilder.reconciliation(reconciliation.donorMode);
	}
	const recipientBuilder = transferEndpoint(resourceId)
		.player('active')
		.change((change) => change.amount(amount));
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
	const donorBuilder = transferEndpoint(resourceId)
		.player('opponent')
		.change((change) => change.percent(-percent));
	if (reconciliation?.donorMode) {
		donorBuilder.reconciliation(reconciliation.donorMode);
	}
	const recipientBuilder = transferEndpoint(resourceId)
		.player('active')
		.change((change) => change.percent(percent));
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
