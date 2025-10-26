import type { ResourceChangeBuilder, ResourceChangeEffectParams, ResourceV2TransferEffectParams } from '../resourceV2';
import { resourceChange, resourceTransfer, transferEndpoint } from '../resourceV2';
import type { ResourceKey } from '../resourceKeys';
import { getResourceV2Id } from '../resourceKeys';
import type { StatKey } from '../stats';
import { getStatResourceV2Id } from '../stats';

type ChangeBuilderConfigurator = (builder: ResourceChangeBuilder) => void;

type ResourceAmountParams = ResourceChangeEffectParams &
	Record<string, unknown> & {
		key: ResourceKey;
		amount: number;
	};

type StatAmountParams = ResourceChangeEffectParams &
	Record<string, unknown> & {
		key: StatKey;
		amount: number;
	};

type StatPercentFromStatParams = ResourceChangeEffectParams &
	Record<string, unknown> & {
		key: StatKey;
		percentStat: StatKey;
	};

type ResourceTransferParams = ResourceV2TransferEffectParams &
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
	const builder = resourceChange(getResourceV2Id(resource));
	builder.amount(amount);
	configureBuilder(builder, configure);
	return {
		...builder.build(),
		key: resource,
		amount,
	};
}

export function statAmountChange(stat: StatKey, amount: number, configure?: ChangeBuilderConfigurator): StatAmountParams {
	const builder = resourceChange(getStatResourceV2Id(stat));
	builder.amount(amount);
	configureBuilder(builder, configure);
	return {
		...builder.build(),
		key: stat,
		amount,
	};
}

export function statPercentFromStatChange(target: StatKey, source: StatKey, configure?: ChangeBuilderConfigurator): StatPercentFromStatParams {
	const builder = resourceChange(getStatResourceV2Id(target));
	builder.percent(0);
	configureBuilder(builder, configure);
	return {
		...builder.build(),
		key: target,
		percentStat: source,
	};
}

export function resourceTransferAmount(resource: ResourceKey, amount: number): ResourceTransferParams {
	const resourceId = getResourceV2Id(resource);
	const donor = transferEndpoint(resourceId)
		.player('opponent')
		.change((change) => change.amount(-amount))
		.build();
	const recipient = transferEndpoint(resourceId)
		.player('active')
		.change((change) => change.amount(amount))
		.build();
	const transfer = resourceTransfer().donor(donor).recipient(recipient).build();
	return {
		...transfer,
		key: resource,
		amount,
	};
}

export function resourceTransferPercent(resource: ResourceKey, percent: number): ResourceTransferParams {
	const resourceId = getResourceV2Id(resource);
	const donor = transferEndpoint(resourceId)
		.player('opponent')
		.change((change) => change.percent(-percent))
		.build();
	const recipient = transferEndpoint(resourceId)
		.player('active')
		.change((change) => change.percent(percent))
		.build();
	const transfer = resourceTransfer().donor(donor).recipient(recipient).build();
	return {
		...transfer,
		key: resource,
		percent,
	};
}
