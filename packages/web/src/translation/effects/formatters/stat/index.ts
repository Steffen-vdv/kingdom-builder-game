import { gainOrLose, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${descriptor.icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${descriptor.icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const icon = descriptor.icon || '';
		const label = descriptor.label || statKey;
		if (format?.percent) {
			const percentMagnitude = Math.abs(amount * 100);
			return `${increaseOrDecrease(amount)} ${icon}${label} by ${percentMagnitude}%`;
		}
		if (prefix) {
			return `${increaseOrDecrease(amount)} ${prefix}${icon} by ${Math.abs(amount)}`;
		}
		return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${descriptor.icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${descriptor.icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const icon = descriptor.icon || '';
		const label = descriptor.label || statKey;
		if (format?.percent) {
			const percentMagnitude = Math.abs(amount * 100);
			return `${increaseOrDecrease(amount)} ${icon}${label} by ${percentMagnitude}%`;
		}
		if (prefix) {
			return `${increaseOrDecrease(amount)} ${prefix}${icon} by ${Math.abs(amount)}`;
		}
		return `${gainOrLose(amount)} ${Math.abs(amount)} ${icon} ${label}`;
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${descriptor.icon}${signed(percentValue)}${percentValue}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			return `${descriptor.icon}${percentageDescriptor.icon}`;
		}
		return descriptor.icon;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			return `${increaseOrDecrease(percentChange)} ${descriptor.icon}${descriptor.label} by ${Math.abs(percentValue)}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			return `Increase ${descriptor.icon}${descriptor.label} by ${percentageDescriptor.icon}${percentageDescriptor.label}`;
		}
		return `${increaseOrDecrease(0)} ${descriptor.icon}${descriptor.label}`;
	},
});
