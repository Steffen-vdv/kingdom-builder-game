import { formatStatIconLabel, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function resolveStatIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string | undefined {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (icon.length === 0 || icon === statKey) {
		return undefined;
	}
	return icon;
}

function resolveStatLabel(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return descriptor.label || statKey;
}

function formatStatSummarySubject(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return (
		resolveStatIcon(descriptor, statKey) ??
		resolveStatLabel(descriptor, statKey)
	);
}

function formatStatIconLabelDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	return formatStatIconLabel(
		descriptor.icon,
		resolveStatLabel(descriptor, statKey),
		statKey,
	);
}

function formatStatChange(amount: number, percent: boolean): string {
	if (percent) {
		const percentValue = amount * 100;
		return `${signed(percentValue)}${percentValue}%`;
	}
	return `${signed(amount)}${amount}`;
}

function formatStatSummary(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const format = descriptor.format;
	const prefix = format?.prefix ?? '';
	const subject = formatStatSummarySubject(descriptor, statKey);
	const change = formatStatChange(amount, Boolean(format?.percent));
	return `${prefix}${subject} ${change}`;
}

function formatStatDescription(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const format = descriptor.format;
	const icon = resolveStatIcon(descriptor, statKey);
	const label = resolveStatLabel(descriptor, statKey);
	const change = formatStatChange(amount, Boolean(format?.percent));
	const parts = [icon, change, label].filter(
		(part): part is string => typeof part === 'string' && part.length > 0,
	);
	return parts.join(' ');
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return formatStatSummary(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return formatStatDescription(descriptor, statKey, amount);
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return formatStatSummary(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return formatStatDescription(descriptor, statKey, amount);
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const prefix = descriptor.format?.prefix ?? '';
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
			const percentageDisplay = formatStatIconLabelDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			return `${prefix}${subject} ${percentageDisplay}`;
		}
		return `${prefix}${subject}`;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const change = formatStatChange(percentChange, true);
			const icon = resolveStatIcon(descriptor, statKey);
			const label = resolveStatLabel(descriptor, statKey);
			const parts = [icon, change, label].filter(
				(part): part is string => typeof part === 'string' && part.length > 0,
			);
			return parts.join(' ');
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const percentageDisplay = formatStatIconLabelDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			const prefix = descriptor.format?.prefix ?? '';
			const subject = formatStatIconLabelDisplay(descriptor, statKey);
			return `Increase ${prefix}${subject} by ${percentageDisplay}`;
		}
		const prefix = descriptor.format?.prefix ?? '';
		const subject = formatStatIconLabelDisplay(descriptor, statKey);
		return `${increaseOrDecrease(0)} ${prefix}${subject}`;
	},
});
