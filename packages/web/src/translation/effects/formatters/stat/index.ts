import { signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function formatSignedValue(amount: number): string {
	const magnitude = Math.abs(amount);
	const sign = amount >= 0 ? '+' : '-';
	return `${sign}${magnitude}`;
}

function formatStatSummarySubject(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (icon && icon !== statKey) {
		return icon;
	}
	return descriptor.label || statKey;
}

function resolveStatDescriptionParts(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): { icon: string; label: string } {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	const label = descriptor.label || statKey;
	if (icon && icon !== statKey) {
		return { icon, label };
	}
	return { icon: '', label };
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const subject = formatStatSummarySubject(descriptor, statKey);
		const change = formatSignedValue(amount);
		return `${prefix}${subject} ${change}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const { icon, label } = resolveStatDescriptionParts(descriptor, statKey);
		const change = formatSignedValue(amount);
		if (icon) {
			return `${icon} ${change} ${label}`;
		}
		return `${change} ${label}`;
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const subject = formatStatSummarySubject(descriptor, statKey);
		const change = formatSignedValue(amount);
		return `${prefix}${subject} ${change}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const { icon, label } = resolveStatDescriptionParts(descriptor, statKey);
		const change = formatSignedValue(amount);
		if (icon) {
			return `${icon} ${change} ${label}`;
		}
		return `${change} ${label}`;
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const subject = formatStatSummarySubject(descriptor, statKey);
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${prefix}${subject} ${signed(percentValue)}${percentValue}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const percentageSubject = formatStatSummarySubject(
				percentageDescriptor,
				percentageStatKey,
			);
			return `${prefix}${subject} ${percentageSubject}`;
		}
		return `${prefix}${subject}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const { icon, label } = resolveStatDescriptionParts(descriptor, statKey);
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			const change = `${signed(percentValue)}${Math.abs(percentValue)}%`;
			if (icon) {
				return `${icon} ${change} ${label}`;
			}
			return `${change} ${label}`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const { icon: percentIcon, label: percentLabel } =
				resolveStatDescriptionParts(percentageDescriptor, percentageStatKey);
			const secondary = percentIcon
				? `${percentIcon} ${percentLabel}`
				: percentLabel;
			if (icon) {
				return `${icon} ${label} ${secondary}`;
			}
			return `${label} ${secondary}`;
		}
		if (icon) {
			return `${icon} ${label}`;
		}
		return label;
	},
});
