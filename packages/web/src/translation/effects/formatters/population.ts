import { registerEffectFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';
import { selectPopulationDescriptor } from '../registrySelectors';

function coerceResourceId(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

registerEffectFormatter('population', 'add', {
	summarize: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const base = selectPopulationDescriptor(context, undefined);
		const roleDescriptor = resourceId
			? selectPopulationDescriptor(context, resourceId)
			: base;
		const roleIcon = roleDescriptor.icon || resourceId || base.icon;
		return `${base.icon}(${roleIcon}) +1`;
	},
	describe: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const { icon, label } = resolvePopulationDisplay(context, resourceId);
		return `${icon}+1 ${label}`;
	},
	log: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const { icon, label } = resolvePopulationDisplay(context, resourceId);
		return `Added ${icon} ${label}`;
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const base = selectPopulationDescriptor(context, undefined);
		const roleDescriptor = resourceId
			? selectPopulationDescriptor(context, resourceId)
			: base;
		const roleIcon = roleDescriptor.icon || resourceId || base.icon;
		return `${base.icon}(${roleIcon}) -1`;
	},
	describe: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const { icon, label } = resolvePopulationDisplay(context, resourceId);
		return `Remove ${icon} ${label}`;
	},
	log: (effect, context) => {
		const resourceId = coerceResourceId(effect.params?.['resourceId']);
		const { icon, label } = resolvePopulationDisplay(context, resourceId);
		return `Removed ${icon} ${label}`;
	},
});
