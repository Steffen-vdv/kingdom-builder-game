import {
	formatStatIconLabel,
	gainOrLose,
	increaseOrDecrease,
	signed,
} from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function formatStatDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const label = descriptor.label || statKey;
	return formatStatIconLabel(descriptor.icon, label, statKey);
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${display} ${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${display} ${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (format?.percent) {
			const percentMagnitude = Math.abs(amount * 100);
			return `${increaseOrDecrease(amount)} ${prefix}${display} by ${percentMagnitude}%`;
		}
		if (prefix) {
			return `${increaseOrDecrease(amount)} ${prefix}${display} by ${Math.abs(amount)}`;
		}
		return `${gainOrLose(amount)} ${Math.abs(amount)} ${display}`;
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${display} ${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${display} ${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (format?.percent) {
			const percentMagnitude = Math.abs(amount * 100);
			return `${increaseOrDecrease(amount)} ${prefix}${display} by ${percentMagnitude}%`;
		}
		if (prefix) {
			return `${increaseOrDecrease(amount)} ${prefix}${display} by ${Math.abs(amount)}`;
		}
		return `${gainOrLose(amount)} ${Math.abs(amount)} ${display}`;
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${prefix}${display} ${signed(percentValue)}${percentValue}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const percentageDisplay = formatStatDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			return `${prefix}${display} ${percentageDisplay}`;
		}
		return `${prefix}${display}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const display = formatStatDisplay(descriptor, statKey);
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			return `${increaseOrDecrease(percentChange)} ${prefix}${display} by ${Math.abs(percentValue)}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const percentageDisplay = formatStatDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			return `Increase ${prefix}${display} by ${percentageDisplay}`;
		}
		return `${increaseOrDecrease(0)} ${prefix}${display}`;
	},
});
