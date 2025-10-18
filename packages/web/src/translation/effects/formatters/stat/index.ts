import { gainOrLose, increaseOrDecrease } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function joinWithSpace(left: string, right: string): string {
	if (!left) {
		return right;
	}
	if (!right) {
		return left;
	}
	if (/\s$/u.test(left) || /^\s/u.test(right)) {
		return `${left}${right}`;
	}
	return `${left} ${right}`;
}

function formatSignedValue(amount: number, percent?: boolean): string {
	const numeric = Number(amount);
	if (!Number.isFinite(numeric)) {
		return '';
	}
	const scaled = percent ? numeric * 100 : numeric;
	const magnitude = Math.abs(scaled);
	const sign = scaled >= 0 ? '+' : '-';
	const base = `${sign}${magnitude}`;
	return percent ? `${base}%` : base;
}

function formatIconWithLabel(
	descriptorIcon: string | undefined,
	descriptorLabel: string | undefined,
): string {
	const icon = descriptorIcon?.trim() ?? '';
	const label = descriptorLabel?.trim() ?? '';
	if (icon && label) {
		return `${icon} ${label}`;
	}
	return icon || label;
}

function formatStatSummary(
	descriptorIcon: string | undefined,
	descriptorLabel: string | undefined,
	amount: number,
	format: { prefix?: string; percent?: boolean } | undefined,
): string {
	const prefix = format?.prefix ?? '';
	const target = formatIconWithLabel(descriptorIcon, descriptorLabel);
	const formattedAmount = formatSignedValue(amount, format?.percent);
	const prefixAndTarget = joinWithSpace(prefix, target);
	return joinWithSpace(prefixAndTarget, formattedAmount);
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return formatStatSummary(
			descriptor.icon,
			descriptor.label,
			amount,
			descriptor.format,
		);
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
		return formatStatSummary(
			descriptor.icon,
			descriptor.label,
			amount,
			descriptor.format,
		);
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
			return formatStatSummary(
				descriptor.icon,
				descriptor.label,
				Number(percent),
				{ ...descriptor.format, percent: true },
			);
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const prefix = descriptor.format?.prefix ?? '';
			const target = formatIconWithLabel(descriptor.icon, descriptor.label);
			const source = formatIconWithLabel(
				percentageDescriptor.icon,
				percentageDescriptor.label,
			);
			return joinWithSpace(joinWithSpace(prefix, target), source);
		}
		return formatIconWithLabel(descriptor.icon, descriptor.label);
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
