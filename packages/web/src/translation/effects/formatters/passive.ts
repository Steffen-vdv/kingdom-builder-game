import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import { PHASES, PASSIVE_INFO } from '@kingdom-builder/contents';

registerEffectFormatter('passive', 'add', {
	summarize: (eff, ctx) => {
		const icon =
			(eff.params?.['icon'] as string | undefined) ?? PASSIVE_INFO.icon;
		const name =
			(eff.params?.['name'] as string | undefined) ?? PASSIVE_INFO.label;
		const prefix = icon ? `${icon} ` : '';
		const inner = summarizeEffects(eff.effects || [], ctx);
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
		return eff.params?.['onUpkeepPhase']
			? [
					{
						title: `${prefix}${name} – Until next ${upkeepLabel}`,
						items: inner,
					},
				]
			: inner;
	},
	describe: (eff, ctx) => {
		const icon =
			(eff.params?.['icon'] as string | undefined) ?? PASSIVE_INFO.icon;
		const name =
			(eff.params?.['name'] as string | undefined) ?? PASSIVE_INFO.label;
		const prefix = icon ? `${icon} ` : '';
		const inner = describeEffects(eff.effects || [], ctx);
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
		return eff.params?.['onUpkeepPhase']
			? [
					{
						title: `${prefix}${name} – Until your next ${upkeepLabel} Phase`,
						items: inner,
					},
				]
			: inner;
	},
	log: (eff, ctx) => {
		const icon =
			(eff.params?.['icon'] as string | undefined) ?? PASSIVE_INFO.icon;
		const name =
			(eff.params?.['name'] as string | undefined) ?? PASSIVE_INFO.label;
		const prefix = icon ? `${icon} ` : '';
		const inner = describeEffects(eff.effects || [], ctx);
		const items = [...(inner.length ? inner : [])];
		const upkeepLabel =
			PHASES.find((p) => p.id === 'upkeep')?.label || 'Upkeep';
		if (eff.params?.['onUpkeepPhase'])
			items.push(
				`${prefix}${name} duration: Until player's next ${upkeepLabel} Phase`,
			);
		return { title: `${prefix}${name} added`, items };
	},
});
