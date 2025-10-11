import {
	gainOrLose,
	increaseOrDecrease,
	resolveStatDisplay,
	signed,
} from '../../helpers';
import { registerEffectFormatter } from '../../factory';

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition, context) => {
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const icon = stat.icon || key;
		const amount = Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const label = stat.label || key;
		const icon = stat.icon || '';
		const amount = Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
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
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const icon = stat.icon || key;
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition, context) => {
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const label = stat.label || key;
		const icon = stat.icon || '';
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
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
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const icon = stat.icon || key;
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${icon}${signed(percentValue)}${percentValue}%`;
		}
		const percentageStatKey = effectDefinition.params?.['percentStat'] as
			| string
			| undefined;
		if (percentageStatKey) {
			const percentageStat = resolveStatDisplay(context, percentageStatKey);
			const percentageStatIcon = percentageStat.icon || percentageStatKey;
			return `${icon}${percentageStatIcon}`;
		}
		return icon;
	},
	describe: (effectDefinition, context) => {
		const rawKey = effectDefinition.params?.['key'];
		const key = typeof rawKey === 'string' ? rawKey : '';
		const stat = resolveStatDisplay(context, key);
		const label = stat.label || key;
		const icon = stat.icon || '';
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = percentChange * 100;
			return `${increaseOrDecrease(percentChange)} ${icon}${label} by ${Math.abs(percentValue)}%`;
		}
		const percentageStatKey = effectDefinition.params?.['percentStat'] as
			| string
			| undefined;
		if (percentageStatKey) {
			const percentageStatInfo = resolveStatDisplay(context, percentageStatKey);
			const percentageStatIcon = percentageStatInfo.icon || '';
			const percentageStatLabel = percentageStatInfo.label || percentageStatKey;
			return `Increase ${icon}${label} by ${percentageStatIcon}${percentageStatLabel}`;
		}
		return `${increaseOrDecrease(0)} ${icon}${label}`;
	},
});
