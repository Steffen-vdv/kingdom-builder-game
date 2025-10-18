import { gainOrLose, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function formatStatDisplay(
	statKey: string,
	descriptor: ReturnType<typeof selectStatDescriptor>,
) {
	const label = descriptor.label || statKey;
	const icon = descriptor.icon || '';
	const prefix = descriptor.format?.prefix;
	const parts: string[] = [];
	if (typeof prefix === 'string' && prefix.trim().length > 0) {
		parts.push(prefix.trim());
	}
	if (icon.trim().length > 0) {
		parts.push(icon.trim());
	}
	if (label.trim().length > 0) {
		parts.push(label.trim());
	}
	if (parts.length === 0) {
		return statKey;
	}
	return parts.join(' ');
}

function resolveStatKey(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const statDisplay = formatStatDisplay(statKey, descriptor);
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${statDisplay} ${signed(percentValue)}${percentValue}%`;
		}
		return `${statDisplay} ${signed(amount)}${amount}`;
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
		const statDisplay = formatStatDisplay(statKey, descriptor);
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${statDisplay} ${signed(percentValue)}${percentValue}%`;
		}
		return `${statDisplay} ${signed(amount)}${amount}`;
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
		const statDisplay = formatStatDisplay(statKey, descriptor);
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${statDisplay} ${signed(percentValue)}${percentValue}%`;
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
				percentageStatKey,
				percentageDescriptor,
			);
			return `${statDisplay} ${percentageDisplay}`;
		}
		return statDisplay;
	},
	describe: (effectDefinition, context) => {
		const statKey = resolveStatKey(effectDefinition.params?.['key']);
		const descriptor = selectStatDescriptor(context, statKey);
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			const statLabel = descriptor.label || statKey;
			const statIcon = descriptor.icon || '';
			const changeVerb = increaseOrDecrease(percentChange);
			return `${changeVerb} ${statIcon}${statLabel} by ${Math.abs(percentValue)}%`;
		}
		const percentageStatKey = resolveStatKey(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageStatKey) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageStatKey,
			);
			const statLabel = descriptor.label || statKey;
			const statIcon = descriptor.icon || '';
			const percentLabel = percentageDescriptor.label || percentageStatKey;
			const percentIcon = percentageDescriptor.icon || '';
			return `Increase ${statIcon}${statLabel} by ${percentIcon}${percentLabel}`;
		}
		const statLabel = descriptor.label || statKey;
		const statIcon = descriptor.icon || '';
		return `${increaseOrDecrease(0)} ${statIcon}${statLabel}`;
	},
});
