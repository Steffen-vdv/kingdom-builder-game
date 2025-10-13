import { signed } from '../helpers';
import { registerEffectFormatter } from '../factory';
import type { TranslationContext } from '../../context';

function resolveLandDescriptor(context: TranslationContext) {
	const icon = context.assets.land.icon ?? '';
	const label = (context.assets.land.label ?? 'Land').trim() || 'Land';
	return { icon, label };
}

function resolveSlotDescriptor(context: TranslationContext) {
	const icon = context.assets.slot.icon ?? '';
	const label =
		(context.assets.slot.label ?? 'Development Slot').trim() ||
		'Development Slot';
	return { icon, label };
}

registerEffectFormatter('land', 'add', {
	summarize: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const land = resolveLandDescriptor(context);
		return `${land.icon}${signed(count)}${count}`.trim();
	},
	describe: (effect, context) => {
		const count = Number(effect.params?.['count'] ?? 1);
		const land = resolveLandDescriptor(context);
		return `${land.icon} ${signed(count)}${count} ${land.label}`.trim();
	},
});

registerEffectFormatter('land', 'till', {
	summarize: (_effect, context) => {
		const slot = resolveSlotDescriptor(context);
		return `${slot.icon}+1`.trim();
	},
	describe: (_effect, context) => {
		const land = resolveLandDescriptor(context);
		const slot = resolveSlotDescriptor(context);
		const landToken = [land.icon, land.label].filter(Boolean).join(' ').trim();
		const slotToken = [slot.icon, slot.label].filter(Boolean).join(' ').trim();
		return `Till ${landToken} to unlock ${slotToken}`;
	},
});
