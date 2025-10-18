import { formatStatIconLabel, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	if (typeof value !== 'string') {
		return '';
	}
	return value.trim();
}

function resolveNormalizedStatKey(key: string): string {
	if (key.length === 0) {
		return key;
	}
	if (key.length === 1) {
		return key.toLowerCase();
	}
	return key.charAt(0).toLowerCase() + key.slice(1);
}

function formatStatDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const label = descriptor.label || statKey;
	return formatStatIconLabel(descriptor.icon, label, statKey);
}

function resolveStatIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (icon.length > 0 && icon !== statKey) {
		return icon;
	}
	const label = descriptor.label || statKey;
	return label;
}

function resolveStatLabel(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return descriptor.label || statKey;
}

function formatStatAmount(
	amount: number,
	descriptor: ReturnType<typeof selectStatDescriptor>,
): string {
	const format = descriptor.format;
	if (format?.percent) {
		const percentValue = amount * 100;
		return `${signed(percentValue)}${percentValue}%`;
	}
	return `${signed(amount)}${amount}`;
}

function formatStatSummary(
	amount: number,
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const prefix = descriptor.format?.prefix ?? '';
	const icon = resolveStatIcon(descriptor, statKey);
	const change = formatStatAmount(amount, descriptor);
	const base = `${icon} ${change}`;
	return prefix ? `${prefix}${base}` : base;
}

function formatStatDescription(
	amount: number,
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon = resolveStatIcon(descriptor, statKey);
	const change = formatStatAmount(amount, descriptor);
	const label = resolveStatLabel(descriptor, statKey);
	return `${icon} ${change} ${label}`;
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const resolvedKey = statKey || normalizedKey;
		return formatStatSummary(amount, descriptor, resolvedKey);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const resolvedKey = statKey || normalizedKey;
		return formatStatDescription(amount, descriptor, resolvedKey);
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const resolvedKey = statKey || normalizedKey;
		return formatStatSummary(amount, descriptor, resolvedKey);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		const resolvedKey = statKey || normalizedKey;
		return formatStatDescription(amount, descriptor, resolvedKey);
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const percent = effectDefinition.params?.['percent'];
		const format = descriptor.format;
		const prefix = format?.prefix ?? '';
		const resolvedKey = statKey || normalizedKey;
		const icon = resolveStatIcon(descriptor, resolvedKey);
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			const base = `${icon} ${signed(percentValue)}${percentValue}%`;
			return prefix ? `${prefix}${base}` : base;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				resolveNormalizedStatKey(percentageStatKey),
			);
			const percentageDisplay = formatStatDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			const base = `${icon} ${percentageDisplay}`;
			return prefix ? `${prefix}${base}` : base;
		}
		return prefix ? `${prefix}${icon}` : icon;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const normalizedKey = resolveNormalizedStatKey(statKey);
		const descriptor = selectStatDescriptor(context, normalizedKey);
		const percent = effectDefinition.params?.['percent'];
		const resolvedKey = statKey || normalizedKey;
		const icon = resolveStatIcon(descriptor, resolvedKey);
		const label = resolveStatLabel(descriptor, resolvedKey);
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			return `${icon} ${signed(percentValue)}${percentValue}% ${label}`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				resolveNormalizedStatKey(percentageStatKey),
			);
			const percentageDisplay = formatStatDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			return `Increase ${label} by ${percentageDisplay}`;
		}
		return `Increase ${label}`;
	},
});
