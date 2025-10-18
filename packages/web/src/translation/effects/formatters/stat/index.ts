import { increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function resolveStatIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (icon.length === 0 || icon === statKey) {
		return '';
	}
	return icon;
}

function resolveStatLabel(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return descriptor.label || statKey;
}

function formatStatDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon = resolveStatIcon(descriptor, statKey);
	const label = resolveStatLabel(descriptor, statKey);
	if (icon) {
		return `${icon} ${label}`;
	}
	return label;
}

function resolveStatPrefix(
	descriptor: ReturnType<typeof selectStatDescriptor>,
): string {
	const prefix = descriptor.format?.prefix;
	if (typeof prefix !== 'string') {
		return '';
	}
	const trimmed = prefix.trim();
	return trimmed.length > 0 ? trimmed : '';
}

function formatSignedAmount(amount: number): string {
	return `${signed(amount)}${amount}`;
}

function summarizeStatChange(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const icon = resolveStatIcon(descriptor, statKey);
	const label = resolveStatLabel(descriptor, statKey);
	const prefix = resolveStatPrefix(descriptor);
	const leading: string[] = [];
	if (prefix) {
		leading.push(prefix);
	}
	if (icon) {
		leading.push(icon);
	} else if (label) {
		leading.push(label);
	}
	const change = formatSignedAmount(amount);
	if (leading.length === 0) {
		return change;
	}
	return `${leading.join(' ')} ${change}`;
}

function describeStatChange(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const icon = resolveStatIcon(descriptor, statKey);
	const label = resolveStatLabel(descriptor, statKey);
	const change = formatSignedAmount(amount);
	if (icon) {
		return `${icon} ${change} ${label}`;
	}
	if (label) {
		return `${change} ${label}`;
	}
	return change;
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return summarizeStatChange(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return describeStatChange(descriptor, statKey, amount);
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return summarizeStatChange(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return describeStatChange(descriptor, statKey, amount);
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
