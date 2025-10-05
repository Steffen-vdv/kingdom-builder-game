import { describeContent } from '../../content';
import { registerEffectFormatter } from '../factory';

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
		const decoratedLabel = [icon, label].filter(Boolean).join(' ').trim();
		const details = describeContent('development', id, ctx);
		if (!details.length) {
			const addition = `Add ${decoratedLabel}`.trim();
			return addition;
		}
		const title = decoratedLabel.length > 0 ? decoratedLabel : label || id;
		const detailItems = details.slice();
		const normalizedTitle = title.trim();
		if (
			normalizedTitle.length > 0 &&
			!detailItems.some(
				(entry) =>
					typeof entry === 'string' && entry.trim() === normalizedTitle,
			)
		) {
			detailItems.unshift(normalizedTitle);
		}
		return [
			{
				title,
				items: detailItems,
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
		const decoratedLabel = [icon, label].filter(Boolean).join(' ').trim();
		return `Remove ${decoratedLabel}`.trim();
	},
});
