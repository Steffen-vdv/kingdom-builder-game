import { formatStatIconLabel, increaseOrDecrease, signed } from '../../helpers';
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

function resolveIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (!icon || icon === statKey) {
		return '';
	}
	return icon;
}

function normalizePrefix(prefix: string | undefined): string {
	if (typeof prefix !== 'string') {
		return '';
	}
	const trimmed = prefix.trim();
	return trimmed.length > 0 ? trimmed : '';
}

function formatSummaryDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon = resolveIcon(descriptor, statKey);
	const label = descriptor.label || statKey;
	const prefix = normalizePrefix(descriptor.format?.prefix);
	const parts: string[] = [];
	if (prefix && (icon || !label.startsWith(prefix))) {
		parts.push(prefix);
	}
	parts.push(icon || label);
	return parts.join(' ').trim();
}

function formatStatDelta(
	amount: number,
	format: ReturnType<typeof selectStatDescriptor>['format'],
): string {
	if (format?.percent) {
		const percentValue = amount * 100;
		return `${signed(percentValue)}${percentValue}%`;
	}
	return `${signed(amount)}${amount}`;
}

function formatSummary(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const display = formatSummaryDisplay(descriptor, statKey);
	const delta = formatStatDelta(amount, descriptor.format);
	return display ? `${display} ${delta}` : delta;
}

function formatDescription(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const icon = resolveIcon(descriptor, statKey);
	const label = descriptor.label || statKey;
	const delta = formatStatDelta(amount, descriptor.format);
	const detail = `${delta} ${label}`.trim();
	return icon ? `${icon} ${detail}` : detail;
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return formatSummary(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		return formatDescription(descriptor, statKey, amount);
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return formatSummary(descriptor, statKey, amount);
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = -Number(effectDefinition.params?.['amount']);
		return formatDescription(descriptor, statKey, amount);
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		const display = formatSummaryDisplay(descriptor, statKey);
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			const delta = `${signed(percentValue)}${percentValue}%`;
			return display ? `${display} ${delta}` : delta;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const percentageDisplay = formatSummaryDisplay(
				percentageDescriptor,
				percentageStatKey,
			);
			if (display && percentageDisplay) {
				return `${display} ${percentageDisplay}`;
			}
			return display || percentageDisplay;
		}
		return display;
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
