import { STATS } from '@kingdom-builder/contents';
import { gainOrLose, increaseOrDecrease, signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';

registerEffectFormatter('stat', 'add', {
	summarize: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const icon = stat?.icon || key;
		const amount = Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const label = stat?.label || key;
		const icon = stat?.icon || '';
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
	summarize: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const icon = stat?.icon || key;
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = stat?.addFormat;
		const prefix = format?.prefix || '';
		if (format?.percent) {
			const percentValue = amount * 100;
			return `${prefix}${icon}${signed(percentValue)}${percentValue}%`;
		}
		return `${prefix}${icon}${signed(amount)}${amount}`;
	},
	describe: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const label = stat?.label || key;
		const icon = stat?.icon || '';
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
	summarize: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const icon = stat ? stat.icon : key;
		const percent = effectDefinition.params?.['percent'];
		if (percent !== undefined) {
			const percentValue = Number(percent) * 100;
			return `${icon}${signed(percentValue)}${percentValue}%`;
		}
		const percentageStatKey = effectDefinition.params?.['percentStat'] as
			| string
			| undefined;
		if (percentageStatKey) {
			const percentageStatIcon =
				STATS[percentageStatKey as keyof typeof STATS]?.icon ||
				percentageStatKey;
			return `${icon}${percentageStatIcon}`;
		}
		return icon;
	},
	describe: (effectDefinition) => {
		const key = effectDefinition.params?.['key'] as string;
		const stat = STATS[key as keyof typeof STATS];
		const label = stat?.label || key;
		const icon = stat?.icon || '';
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
			const percentageStatInfo = STATS[percentageStatKey as keyof typeof STATS];
			const percentageStatIcon = percentageStatInfo?.icon || '';
			const percentageStatLabel =
				percentageStatInfo?.label || percentageStatKey;
			return `Increase ${icon}${label} by ${percentageStatIcon}${percentageStatLabel}`;
		}
		return `${increaseOrDecrease(0)} ${icon}${label}`;
	},
});
