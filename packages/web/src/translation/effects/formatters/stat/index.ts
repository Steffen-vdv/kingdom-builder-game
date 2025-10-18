import { formatStatIconLabel, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function applyPrefix(label: string, prefix: string | undefined): string {
	const trimmedLabel = label.trimStart();
	if (!prefix) {
		return trimmedLabel;
	}
	const trimmedPrefix = prefix.trim();
	if (trimmedPrefix.length === 0) {
		return trimmedLabel;
	}
	if (trimmedLabel.toLowerCase().startsWith(trimmedPrefix.toLowerCase())) {
		return trimmedLabel;
	}
	return `${prefix}${trimmedLabel}`;
}

function formatStatIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (icon.length > 0 && icon !== statKey) {
		return icon;
	}
	return descriptor.label || statKey;
}

function formatStatLabel(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return descriptor.label || statKey;
}

function formatStatSummaryDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	prefix: string | undefined,
): string {
	const display = formatStatIcon(descriptor, statKey);
	return applyPrefix(display, prefix);
}

function formatStatDescription(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	prefix: string | undefined,
	amount: number,
): string {
	const icon = formatStatIcon(descriptor, statKey);
	const label = applyPrefix(formatStatLabel(descriptor, statKey), prefix);
	const sign = amount >= 0 ? '+' : '-';
	const magnitude = Math.abs(amount);
	return `${icon} ${sign}${magnitude} ${label}`;
}

function formatStatDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const label = formatStatLabel(descriptor, statKey);
	return formatStatIconLabel(descriptor.icon, label, statKey);
}

function resolveStatPrefix(
	descriptor: ReturnType<typeof selectStatDescriptor>,
): string | undefined {
	return descriptor.format?.prefix;
}

function resolveStatAmount(value: unknown): number {
	return Number(value);
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = resolveStatAmount(effectDefinition.params?.['amount']);
		const prefix = resolveStatPrefix(descriptor);
		const display = formatStatSummaryDisplay(descriptor, statKey, prefix);
		return `${display} ${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = resolveStatAmount(effectDefinition.params?.['amount']);
		const prefix = resolveStatPrefix(descriptor);
		return formatStatDescription(descriptor, statKey, prefix, amount);
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -resolveStatAmount(effectDefinition.params?.['amount']);
		const prefix = resolveStatPrefix(descriptor);
		const display = formatStatSummaryDisplay(descriptor, statKey, prefix);
		return `${display} ${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -resolveStatAmount(effectDefinition.params?.['amount']);
		const prefix = resolveStatPrefix(descriptor);
		return formatStatDescription(descriptor, statKey, prefix, amount);
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
