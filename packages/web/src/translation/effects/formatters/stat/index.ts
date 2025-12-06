import { signed } from '../../helpers';
import { registerEffectFormatter } from '../../factory';
import { selectStatDescriptor } from '../../registrySelectors';

function resolveResourceId(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function formatSignedValue(
	amount: number,
	descriptor: ReturnType<typeof selectStatDescriptor>,
): string {
	const usesPercent = descriptor.format?.percent === true;
	const resolvedAmount = usesPercent
		? Number((amount * 100).toFixed(2))
		: amount;
	const sign = resolvedAmount >= 0 ? '+' : '-';
	const magnitude = Math.abs(resolvedAmount);
	const suffix = usesPercent ? '%' : '';
	return `${sign}${magnitude}${suffix}`;
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

function appendFormatSuffix(
	format: ReturnType<typeof selectStatDescriptor>['format'],
	content: string,
): string {
	const suffix = typeof format?.prefix === 'string' ? format.prefix.trim() : '';
	if (!suffix) {
		return content;
	}
	return `${content} ${suffix}`.trim();
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
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const amount = Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const subject = formatStatSummarySubject(descriptor, resourceId);
		const change = formatSignedValue(amount, descriptor);
		return appendFormatSuffix(format, `${subject} ${change}`);
	},
	describe: (effectDefinition, context) => {
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const amount = Number(effectDefinition.params?.['amount']);
		const { icon, label } = resolveStatDescriptionParts(descriptor, resourceId);
		const change = formatSignedValue(amount, descriptor);
		if (icon) {
			return `${icon} ${change} ${label}`;
		}
		return `${change} ${label}`;
	},
});

registerEffectFormatter('stat', 'remove', {
	summarize: (effectDefinition, context) => {
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const amount = -Number(effectDefinition.params?.['amount']);
		const format = descriptor.format;
		const subject = formatStatSummarySubject(descriptor, resourceId);
		const change = formatSignedValue(amount, descriptor);
		return appendFormatSuffix(format, `${subject} ${change}`);
	},
	describe: (effectDefinition, context) => {
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const amount = -Number(effectDefinition.params?.['amount']);
		const { icon, label } = resolveStatDescriptionParts(descriptor, resourceId);
		const change = formatSignedValue(amount, descriptor);
		if (icon) {
			return `${icon} ${change} ${label}`;
		}
		return `${change} ${label}`;
	},
});

registerEffectFormatter('stat', 'add_pct', {
	summarize: (effectDefinition, context) => {
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const percent = effectDefinition.params?.['percent'];
		const format = descriptor.format;
		const subject = formatStatSummarySubject(descriptor, resourceId);
		if (percent !== undefined) {
			const percentValue = Number((Number(percent) * 100).toFixed(2));
			return appendFormatSuffix(
				format,
				`${subject} ${signed(percentValue)}${percentValue}%`,
			);
		}
		const percentageResourceId = resolveResourceId(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageResourceId) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageResourceId,
			);
			const percentageSubject = formatStatSummarySubject(
				percentageDescriptor,
				percentageResourceId,
			);
			return appendFormatSuffix(format, `${subject} ${percentageSubject}`);
		}
		return appendFormatSuffix(format, subject);
	},
	describe: (effectDefinition, context) => {
		const resourceId = resolveResourceId(effectDefinition.params?.['resourceId']);
		const descriptor = selectStatDescriptor(context, resourceId);
		const percent = effectDefinition.params?.['percent'];
		const { icon, label } = resolveStatDescriptionParts(descriptor, resourceId);
		if (percent !== undefined) {
			const percentChange = Number(percent);
			const percentValue = Number((percentChange * 100).toFixed(2));
			const change = `${signed(percentValue)}${percentValue}%`;
			if (icon) {
				return `${icon} ${change} ${label}`;
			}
			return `${change} ${label}`;
		}
		const percentageResourceId = resolveResourceId(
			effectDefinition.params?.['percentStat'],
		);
		if (percentageResourceId) {
			const percentageDescriptor = selectStatDescriptor(
				context,
				percentageResourceId,
			);
			const { icon: percentIcon, label: percentLabel } =
				resolveStatDescriptionParts(percentageDescriptor, percentageResourceId);
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
