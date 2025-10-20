import { registerEffectFormatter } from '../factory';
import { resolvePopulationDisplay } from '../helpers';
import { selectPopulationDescriptor } from '../registrySelectors';

function coercePopulationRole(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

registerEffectFormatter('population', 'add', {
	summarize: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const base = selectPopulationDescriptor(context, undefined);
		const roleDescriptor = role
			? selectPopulationDescriptor(context, role)
			: base;
		const roleIcon = roleDescriptor.icon || role || base.icon;
		return `${base.icon}(${roleIcon}) +1`;
	},
	describe: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const { icon, label } = resolvePopulationDisplay(context, role);
		return `${icon}+1 ${label}`;
	},
	log: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const { icon, label } = resolvePopulationDisplay(context, role);
		return `Added ${icon} ${label}`;
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const base = selectPopulationDescriptor(context, undefined);
		const roleDescriptor = role
			? selectPopulationDescriptor(context, role)
			: base;
		const roleIcon = roleDescriptor.icon || role || base.icon;
		return `${base.icon}(${roleIcon}) -1`;
	},
	describe: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const { icon, label } = resolvePopulationDisplay(context, role);
		return `Remove ${icon} ${label}`;
	},
	log: (effect, context) => {
		const role = coercePopulationRole(effect.params?.['role']);
		const { icon, label } = resolvePopulationDisplay(context, role);
		return `Removed ${icon} ${label}`;
	},
});
