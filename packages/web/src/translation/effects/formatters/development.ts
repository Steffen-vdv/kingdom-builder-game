import { registerEffectFormatter } from '../factory';
import { describeContent } from '../../content';

registerEffectFormatter('development', 'add', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		let definition:
			| { icon?: string | undefined; name?: string | undefined }
			| undefined;
		try {
			definition = context.developments.get(id);
		} catch {
			/* ignore */
		}
		const icon = definition?.icon || '';
		const name = definition?.name || id;
		return [icon, name].filter(Boolean).join(' ').trim() || id;
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string;
		let definition:
			| { name?: string | undefined; icon?: string | undefined }
			| undefined;
		try {
			definition = context.developments.get(id);
		} catch {
			/* ignore */
		}
		const label = definition?.name || id;
		const icon = definition?.icon || '';
		const details = describeContent('development', id, context);
		if (details.length === 0) {
			return `${icon}${label}`.trim() || id;
		}
		return [
			{
				title: [icon, label].filter(Boolean).join(' ').trim(),
				items: details,
			},
		];
	},
});

registerEffectFormatter('development', 'remove', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string;
		let icon = id;
		try {
			icon = context.developments.get(id).icon || id;
		} catch {
			/* ignore */
		}
		return `Remove ${icon}`;
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string;
		let definition:
			| { name?: string | undefined; icon?: string | undefined }
			| undefined;
		try {
			definition = context.developments.get(id);
		} catch {
			/* ignore */
		}
		const label = definition?.name || id;
		const icon = definition?.icon || '';
		return `Remove ${icon}${label}`;
	},
});
