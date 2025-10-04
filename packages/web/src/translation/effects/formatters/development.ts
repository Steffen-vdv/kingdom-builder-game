import { registerEffectFormatter } from '../factory';
import { describeContent } from '../../content';

registerEffectFormatter('development', 'add', {
	summarize: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		let icon = id;
		try {
			icon = ctx.developments.get(id).icon || id;
		} catch {
			/* ignore */
		}
		return `${icon}`;
	},
	describe: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		let def: { name: string; icon?: string | undefined } | undefined;
		try {
			def = ctx.developments.get(id);
		} catch {
			/* ignore */
		}
		const label = def?.name || id;
		const icon = def?.icon || '';
		const details = describeContent('development', id, ctx);
		const combined = [icon, label].filter(Boolean).join(' ').trim();
		const addLabel = combined.length > 0 ? `Add ${combined}` : 'Add';
		if (!details.length) {
			return addLabel;
		}
		return [
			addLabel,
			{
				title: combined || label,
				items: details,
			},
		];
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		let icon = id;
		try {
			icon = ctx.developments.get(id).icon || id;
		} catch {
			/* ignore */
		}
		return `Remove ${icon}`;
	},
	describe: (eff, ctx) => {
		const id = eff.params?.['id'] as string;
		let def: { name: string; icon?: string | undefined } | undefined;
		try {
			def = ctx.developments.get(id);
		} catch {
			/* ignore */
		}
		const label = def?.name || id;
		const icon = def?.icon || '';
		return `Remove ${icon}${label}`;
	},
});
